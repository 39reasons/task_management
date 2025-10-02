import type { Task } from "@shared/types";
import {
  DndContext,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { useState } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanOverlay } from "./KanbanOverlay";
import { useParams } from "react-router-dom";
import { useModal } from "../ModalStack";

interface KanbanBoardProps {
  tasks: Task[];
  onDelete?: (id: Task["id"]) => void;
  onUpdatePriority: (id: Task["id"], priority: Task["priority"]) => void;
  onUpdateStatus: (id: Task["id"], status: Task["status"]) => void;
  onUpdateTask: (updatedTask: Partial<Task>) => void;
  onAddTask?: (title: string, status: Task["status"], project_id: string | null) => void;
  user: { id: string; username: string; name: string } | null;
  setSelectedTask: (task: Task) => void;
}

type StatusKey = "todo" | "in-progress" | "done";

export function KanbanBoard({
  tasks,
  onDelete,
  onUpdateStatus,
  onAddTask,
  user,
  setSelectedTask,
}: KanbanBoardProps) {
  const { id: selected_project_id } = useParams<{ id: string }>();
  const { openModal } = useModal();

  const STATUSES: StatusKey[] = ["todo", "in-progress", "done"];
  const STATUS_LABELS: Record<StatusKey, string> = {
    todo: "To Do",
    "in-progress": "In Progress",
    done: "Done",
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const task = tasks.find((t) => String(t.id) === activeId);
    if (!task) return;

    if (["todo", "in-progress", "done"].includes(overId)) {
      const newStatus = overId as StatusKey;
      if (task.status !== newStatus) onUpdateStatus(task.id, newStatus);
    } else {
      const targetTask = tasks.find((t) => String(t.id) === overId);
      if (targetTask && task.status !== targetTask.status) {
        onUpdateStatus(task.id, targetTask.status as StatusKey);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={(e) => {
        const task = tasks.find((t) => String(t.id) === String(e.active.id));
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
            tasks={tasks.filter((t) => (t.status ?? "todo") === status)}
            onDelete={user ? onDelete : undefined}
            onTaskClick={(task) => {
              setSelectedTask(task);
              openModal("task");
            }}
            onAddTask={user && onAddTask ? onAddTask : undefined}
            selected_project_id={selected_project_id ?? null}
          />
        ))}
      </div>

      <DragOverlay>
        <KanbanOverlay task={activeTask} />
      </DragOverlay>
    </DndContext>
  );
}
