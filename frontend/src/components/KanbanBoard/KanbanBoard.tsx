import type { Task } from "@shared/types";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { useState } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanTask } from "./KanbanTask";

interface KanbanBoardProps {
  tasks: Task[];
  onDelete: (id: string) => void;
  onUpdatePriority: (id: string, priority: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
}

export function KanbanBoard({
  tasks,
  onDelete,
  onUpdatePriority,
  onUpdateStatus,
}: KanbanBoardProps) {
  const STATUSES = ["todo", "in-progress", "done"];
  const STATUS_LABELS: Record<string, string> = {
    todo: "To Do",
    "in-progress": "In Progress",
    done: "Done",
  };

  const sensors = useSensors(useSensor(PointerSensor));
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const task = tasks.find((t) => String(t.id) === activeId);
    if (!task) return;

    if (STATUSES.includes(overId)) {
      if (task.status !== overId) {
        onUpdateStatus(task.id, overId);
      }
    } else {
      const targetTask = tasks.find((t) => String(t.id) === overId);
      if (targetTask && task.status !== targetTask.status) {
        onUpdateStatus(task.id, targetTask.status);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event) => {
        const task = tasks.find((t) => String(t.id) === String(event.active.id));
        setActiveTask(task || null);
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            id={status}
            title={STATUS_LABELS[status]}
            tasks={tasks.filter((t) => t.status === status)}
            onDelete={onDelete}
            onUpdatePriority={onUpdatePriority}
            onUpdateStatus={onUpdateStatus}
          />
        ))}
      </div>

    <DragOverlay>
    {activeTask ? (
        <KanbanTask
        task={activeTask}
        onDelete={() => {}}
        onUpdatePriority={() => {}}
        onUpdateStatus={() => {}}
        />
    ) : null}
    </DragOverlay>
    </DndContext>
  );
}
