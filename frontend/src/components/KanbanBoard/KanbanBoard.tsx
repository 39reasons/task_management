import type { Stage, Task, AuthUser } from "@shared/types";
import {
  DndContext,
  closestCorners,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  type CollisionDetection,
} from "@dnd-kit/core";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanOverlay } from "./KanbanOverlay";
import { useModal } from "../ModalStack";
import { Plus, CornerDownLeft } from "lucide-react";

const STAGE_NAME_MAX_LENGTH = 512;

const collisionDetectionStrategy: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  const rectangleCollisions = rectIntersection(args);
  if (rectangleCollisions.length > 0) {
    return rectangleCollisions;
  }

  return closestCorners(args);
};

function cloneStages(stages: Array<Stage & { tasks: Task[] }>) {
  return stages.map((stage) => ({
    ...stage,
    tasks: stage.tasks.map((task) => ({ ...task })),
  }));
}

function areStagesEquivalent(
  nextStages: Array<Stage & { tasks: Task[] }>,
  currentStages: Array<Stage & { tasks: Task[] }>
) {
  if (nextStages.length !== currentStages.length) {
    return false;
  }

  const byId = new Map(currentStages.map((stage) => [stage.id, stage]));
  for (const stage of nextStages) {
    const comparison = byId.get(stage.id);
    if (!comparison) {
      return false;
    }

    const stageTasks = [...stage.tasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const comparisonTasks = [...comparison.tasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    if (stageTasks.length !== comparisonTasks.length) {
      return false;
    }

    for (let index = 0; index < stageTasks.length; index += 1) {
      const task = stageTasks[index];
      const other = comparisonTasks[index];
      if (!other) {
        return false;
      }
      if (task.id !== other.id) {
        return false;
      }
      if ((task.position ?? index) !== (other.position ?? index)) {
        return false;
      }
      if (
        task.title !== other.title ||
        (task.description ?? "") !== (other.description ?? "") ||
        (task.due_date ?? "") !== (other.due_date ?? "") ||
        (task.priority ?? "") !== (other.priority ?? "")
      ) {
        return false;
      }
      const taskAssigneeIds = (task.assignees ?? []).map((member) => member.id).join(",");
      const otherAssigneeIds = (other.assignees ?? []).map((member) => member.id).join(",");
      if (taskAssigneeIds !== otherAssigneeIds) {
        return false;
      }
      const taskTagIds = (task.tags ?? []).map((tag) => tag.id).join(",");
      const otherTagIds = (other.tags ?? []).map((tag) => tag.id).join(",");
      if (taskTagIds !== otherTagIds) {
        return false;
      }
    }
  }

  return true;
}

interface KanbanBoardProps {
  stages: Array<Stage & { tasks: Task[] }>;
  onDelete?: (id: Task["id"]) => void;
  onMoveTask?: (taskId: Task["id"], stageId: Stage["id"]) => Promise<void> | void;
  onReorderTasks?: (stageId: Stage["id"], orderedIds: string[]) => Promise<void> | void;
  onAddTask?: (stage_id: Stage["id"], title: string) => void;
  onAddStage?: (name: string) => void;
  onDeleteStage?: (stage_id: Stage["id"]) => void;
  user: AuthUser | null;
  setSelectedTask: (task: Task) => void;
}

export function KanbanBoard({
  stages,
  onDelete,
  onMoveTask,
  onReorderTasks,
  onAddTask,
  onAddStage,
  onDeleteStage,
  user,
  setSelectedTask,
}: KanbanBoardProps) {
  const { openModal } = useModal();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const addStageContainerRef = useRef<HTMLDivElement | null>(null);
  const addStageInputRef = useRef<HTMLInputElement | null>(null);
  const [displayStages, setDisplayStages] = useState(() => cloneStages(stages));

  useEffect(() => {
    if (!areStagesEquivalent(stages, displayStages)) {
      setDisplayStages(cloneStages(stages));
    }
  }, [stages, displayStages]);

  const allTasks = useMemo(() => displayStages.flatMap((stage) => stage.tasks ?? []), [displayStages]);
  const stageMap = useMemo(() => {
    const map = new Map<string, Stage>();
    for (const stage of displayStages) {
      map.set(stage.id, stage);
    }
    return map;
  }, [displayStages]);
  const tasksByStage = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const stage of displayStages) {
      map.set(stage.id, [...(stage.tasks ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
    }
    return map;
  }, [displayStages]);
  const taskMap = useMemo(() => {
    const map = new Map<string, Task>();
    for (const task of allTasks) {
      map.set(String(task.id), task);
    }
    return map;
  }, [allTasks]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const task = allTasks.find((t) => String(t.id) === activeId);
    if (!task) return;

    let destinationStageId: string | null = null;
    let insertIndex: number | null = null;

    if (stageMap.has(overId)) {
      destinationStageId = overId;
      insertIndex = (tasksByStage.get(overId)?.length ?? 0);
    } else if (taskMap.has(overId)) {
      const targetTask = taskMap.get(overId)!;
      destinationStageId = targetTask.stage_id;
      const stageTasks = tasksByStage.get(destinationStageId) ?? [];
      insertIndex = stageTasks.findIndex((t) => String(t.id) === overId);
    }

    if (!destinationStageId || insertIndex === null) return;

    const sourceStageId = task.stage_id;

    const applyPositions = (tasks: Task[], stageId: string) =>
      tasks.map((t, index) => ({ ...t, stage_id: stageId, position: index }));

    if (destinationStageId !== sourceStageId) {
      const destinationTasks = tasksByStage.get(destinationStageId) ?? [];
      const destinationWithout = destinationTasks.filter((t) => String(t.id) !== activeId);
      const movedTask = { ...task, stage_id: destinationStageId };
      const nextDestination = [...destinationWithout];
      nextDestination.splice(insertIndex, 0, movedTask);

      const sourceTasks = tasksByStage.get(sourceStageId) ?? [];
      const sourceWithout = sourceTasks.filter((t) => String(t.id) !== activeId);

      const destinationWithPositions = applyPositions(nextDestination, destinationStageId);
      const sourceWithPositions = applyPositions(sourceWithout, sourceStageId);

      setDisplayStages((prev) =>
        prev.map((stage) => {
          if (stage.id === destinationStageId) {
            return {
              ...stage,
              tasks: destinationWithPositions,
            };
          }
          if (stage.id === sourceStageId) {
            return {
              ...stage,
              tasks: sourceWithPositions,
            };
          }
          return stage;
        })
      );

      if (onMoveTask || onReorderTasks) {
        void (async () => {
          try {
            if (onMoveTask) {
              await onMoveTask(task.id, destinationStageId);
            }
            if (onReorderTasks) {
              await onReorderTasks(destinationStageId, destinationWithPositions.map((t) => String(t.id)));
              await onReorderTasks(sourceStageId, sourceWithPositions.map((t) => String(t.id)));
            }
          } catch (error) {
            console.error("Failed to persist task move", error);
            setDisplayStages((prev) =>
              areStagesEquivalent(stages, prev) ? prev : cloneStages(stages)
            );
          }
        })();
      }
    } else {
      const stageTasks = tasksByStage.get(sourceStageId) ?? [];
      const filtered = stageTasks.filter((t) => String(t.id) !== activeId);
      filtered.splice(insertIndex, 0, task);
      const reorderedWithPositions = applyPositions(filtered, sourceStageId);

      setDisplayStages((prev) =>
        prev.map((stage) =>
          stage.id === sourceStageId
            ? {
                ...stage,
                tasks: reorderedWithPositions,
              }
            : stage
        )
      );

      if (onReorderTasks) {
        void (async () => {
          try {
            await onReorderTasks(sourceStageId, reorderedWithPositions.map((t) => String(t.id)));
          } catch (error) {
            console.error("Failed to persist task reorder", error);
            setDisplayStages((prev) =>
              areStagesEquivalent(stages, prev) ? prev : cloneStages(stages)
            );
          }
        })();
      }
    }
  };

  useEffect(() => {
    if (!isAddingStage) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!addStageContainerRef.current?.contains(event.target as Node)) {
        setIsAddingStage(false);
        setNewStageName("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAddingStage]);

  useEffect(() => {
    if (isAddingStage) {
      addStageInputRef.current?.focus();
    }
  }, [isAddingStage]);

  const submitNewStage = async () => {
    if (!onAddStage) return;
    const value = newStageName.trim();
    if (!value) return;
    if (value.length > STAGE_NAME_MAX_LENGTH) return;
    await Promise.resolve(onAddStage(value));
    setNewStageName("");
    setIsAddingStage(false);
  };

  const handleAddStageSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await submitNewStage();
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={(e) => {
        const task = allTasks.find((t) => String(t.id) === String(e.active.id));
        setActiveTask(task || null);
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        {displayStages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            onDelete={user ? onDelete : undefined}
            onTaskClick={(task) => {
              setSelectedTask(task);
              openModal("task");
            }}
            onAddTask={user && onAddTask ? onAddTask : undefined}
            onDeleteStage={user && onDeleteStage ? onDeleteStage : undefined}
          />
        ))}

        {user && onAddStage && (
          <div className="flex flex-col gap-3">
            {!isAddingStage ? (
              <button
                onClick={() => setIsAddingStage(true)}
                className="group w-full rounded-2xl border border-dashed border-gray-600/60 bg-slate-900/70 px-4 py-3 text-left transition hover:border-blue-500 hover:bg-slate-900/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
                    <Plus className="h-4 w-4" />
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">Add stage</p>
                    <p className="text-xs text-slate-400">Create a new column for this workflow</p>
                  </div>
                </div>
              </button>
            ) : (
              <div ref={addStageContainerRef} className="w-full">
                <form
                  onPointerDown={(e) => e.stopPropagation()}
                  onSubmit={handleAddStageSubmit}
                  className="group w-full rounded-2xl border border-dashed border-blue-500/70 bg-slate-900/80 px-4 py-3 text-left shadow focus-within:border-blue-500"
                >
                  <div className="flex items-center gap-2">
                    <input
                      ref={addStageInputRef}
                      value={newStageName}
                      onChange={(e) =>
                        setNewStageName(e.target.value.slice(0, STAGE_NAME_MAX_LENGTH))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setIsAddingStage(false);
                          setNewStageName("");
                        }
                      }}
                      placeholder="Add stage title..."
                      className="w-full border-0 bg-transparent text-sm text-white placeholder-slate-500 focus:border-0 focus:outline-none"
                      maxLength={STAGE_NAME_MAX_LENGTH}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newStageName.trim()) {
                          void submitNewStage();
                        }
                      }}
                      disabled={!newStageName.trim()}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                        newStageName.trim()
                          ? "border-transparent text-blue-400 hover:bg-blue-500/10"
                          : "border-transparent text-slate-600"
                      }`}
                      aria-label="Add stage"
                    >
                      <CornerDownLeft size={16} />
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      <DragOverlay>
        <KanbanOverlay task={activeTask} />
      </DragOverlay>
    </DndContext>
  );
}
