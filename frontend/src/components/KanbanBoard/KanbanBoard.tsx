import type { Stage, Task } from "@shared/types";
import {
  DndContext,
  pointerWithin,
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

interface KanbanBoardProps {
  stages: Array<Stage & { tasks: Task[] }>;
  onDelete?: (id: Task["id"]) => void;
  onMoveTask?: (taskId: Task["id"], stageId: Stage["id"]) => void;
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over || !onMoveTask) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const task = allTasks.find((t) => String(t.id) === activeId);
    if (!task) return;

    if (stageMap.has(overId)) {
      if (task.stage_id !== overId) onMoveTask(task.id, overId);
      return;
    }

    const targetTask = allTasks.find((t) => String(t.id) === overId);
    if (targetTask && targetTask.stage_id !== task.stage_id) {
      onMoveTask(task.id, targetTask.stage_id);
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
      collisionDetection={pointerWithin}
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
          <div className="bg-gray-800 rounded-lg p-4 shadow border border-dashed border-gray-600 flex flex-col justify-between">
            {!isAddingStage ? (
              <button
                onClick={() => setIsAddingStage(true)}
                className="w-full h-full text-left text-white/80 hover:text-white"
              >
                + Add Stage
              </button>
            ) : (
              <form onSubmit={handleAddStageSubmit} className="flex flex-col gap-2">
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
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-md px-3 py-2"
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
