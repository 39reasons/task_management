import type { Stage, Task } from "@shared/types";
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

interface KanbanBoardProps {
  stages: Array<Stage & { tasks: Task[] }>;
  onDelete?: (id: Task["id"]) => void;
  onMoveTask?: (taskId: Task["id"], stageId: Stage["id"]) => Promise<void> | void;
  onReorderTasks?: (stageId: Stage["id"], orderedIds: string[]) => Promise<void> | void;
  onAddTask?: (stage_id: Stage["id"], title: string) => void;
  onAddStage?: (name: string) => void;
  onDeleteStage?: (stage_id: Stage["id"]) => void;
  user: { id: string; username: string; name: string } | null;
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
        if (sourceWithout.length > 0) {
          await Promise.resolve(onReorderTasks(sourceStageId, sourceWithout.map((t) => String(t.id))));
        }
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
          <div className="flex flex-col gap-2">
            {!isAddingStage ? (
              <button
                onClick={() => setIsAddingStage(true)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 flex items-center gap-2 text-white/90 hover:text-white hover:border-gray-500 transition"
              >
                <Plus size={18} />
                <span className="font-semibold">Add Stage</span>
              </button>
            ) : (
              <form onSubmit={handleAddStageSubmit} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 flex flex-col gap-2">
                <input
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="Stage name"
                  className="rounded-md bg-gray-900 border border-gray-700 text-white px-3 py-2"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md px-3 py-2"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingStage(false);
                      setNewStageName("");
                    }}
                    className="px-3 py-2 text-gray-300 hover:text-red-400"
                  >
                    <X size={18} />
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
