import type { Stage, Task, AuthUser } from "@shared/types";
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { FormEvent, useMemo, useState } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanOverlay } from "./KanbanOverlay";
import { useModal } from "../ModalStack";
import { Plus, X } from "lucide-react";

const STAGE_NAME_MAX_LENGTH = 512;

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

  const allTasks = useMemo(() => stages.flatMap((stage) => stage.tasks ?? []), [stages]);
  const stageMap = useMemo(() => {
    const map = new Map<string, Stage>();
    for (const stage of stages) {
      map.set(stage.id, stage);
    }
    return map;
  }, [stages]);
  const tasksByStage = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const stage of stages) {
      map.set(stage.id, [...(stage.tasks ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
    }
    return map;
  }, [stages]);
  const taskMap = useMemo(() => {
    const map = new Map<string, Task>();
    for (const task of allTasks) {
      map.set(String(task.id), task);
    }
    return map;
  }, [allTasks]);

  const handleDragEnd = async (event: DragEndEvent) => {
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

    if (destinationStageId !== sourceStageId) {
      if (!onMoveTask) return;
      await Promise.resolve(onMoveTask(task.id, destinationStageId));
      if (onReorderTasks) {
        const destinationTasks = tasksByStage.get(destinationStageId) ?? [];
        const withoutTask = destinationTasks.filter((t) => String(t.id) !== activeId);
        const reordered = [...withoutTask];
        reordered.splice(insertIndex, 0, { ...task, stage_id: destinationStageId });
        await Promise.resolve(onReorderTasks(destinationStageId, reordered.map((t) => String(t.id))));
        const sourceTasks = tasksByStage.get(sourceStageId) ?? [];
        const sourceWithout = sourceTasks.filter((t) => String(t.id) !== activeId);
        await Promise.resolve(onReorderTasks(sourceStageId, sourceWithout.map((t) => String(t.id))));
      }
    } else if (onReorderTasks) {
      const stageTasks = tasksByStage.get(sourceStageId) ?? [];
      const filtered = stageTasks.filter((t) => String(t.id) !== activeId);
      filtered.splice(insertIndex, 0, task);
      await Promise.resolve(onReorderTasks(sourceStageId, filtered.map((t) => String(t.id))));
    }
  };

  const handleAddStageSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!onAddStage) return;
    const value = newStageName.trim();
    if (!value) return;
    if (value.length > STAGE_NAME_MAX_LENGTH) return;
    await Promise.resolve(onAddStage(value));
    setNewStageName("");
    setIsAddingStage(false);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e) => {
        const task = allTasks.find((t) => String(t.id) === String(e.active.id));
        setActiveTask(task || null);
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        {stages.map((stage) => (
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
                className="group flex w-full flex-col items-start gap-1 rounded-xl border border-dashed border-gray-600/60 bg-gray-900/70 px-4 py-3 text-left transition hover:border-blue-500 hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <Plus size={18} />
                  Add stage
                </span>
                <span className="text-xs text-gray-400">Create a new column for this workflow</span>
              </button>
            ) : (
              <form
                onSubmit={handleAddStageSubmit}
                className="flex flex-col gap-3 rounded-xl border border-gray-700 bg-gray-900/95 px-4 py-3 shadow"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">New stage</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingStage(false);
                      setNewStageName("");
                    }}
                    className="rounded-md p-1 text-gray-400 transition hover:bg-gray-800 hover:text-gray-100"
                    aria-label="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
                <input
                  value={newStageName}
                  onChange={(e) =>
                    setNewStageName(e.target.value.slice(0, STAGE_NAME_MAX_LENGTH))
                  }
                  placeholder="Stage name"
                  className="w-full rounded-lg border border-gray-700 bg-gray-850 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  autoFocus
                  maxLength={STAGE_NAME_MAX_LENGTH}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
                  >
                    Add stage
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingStage(false);
                      setNewStageName("");
                    }}
                    className="rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:bg-gray-800 hover:text-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
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
