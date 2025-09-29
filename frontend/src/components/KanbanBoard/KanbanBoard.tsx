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
import { TaskModal } from "..//TaskModal/TaskModal";

interface KanbanBoardProps {
  tasks: Task[];
  onDelete: (id: Task["id"]) => void;
  onUpdatePriority: (id: Task["id"], priority: Task["priority"]) => void;
  onUpdateStatus: (id: Task["id"], status: Task["status"]) => void;
  onUpdateTask: (updatedTask: Partial<Task>) => void;
  onAddTask: (title: string, status: Task["status"]) => void; 
  selectedProjectId: string | null;
}

export function KanbanBoard({
  tasks,
  onDelete,
  onUpdatePriority,
  onUpdateStatus,
  onUpdateTask,
  onAddTask,
  selectedProjectId
}: KanbanBoardProps) {
  const STATUSES: Task["status"][] = ["todo", "in-progress", "done"];
  const STATUS_LABELS: Record<Task["status"], string> = {
    todo: "To Do",
    "in-progress": "In Progress",
    done: "Done",
  };

  const sensors = useSensors(useSensor(PointerSensor));
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const task = tasks.find((t) => String(t.id) === activeId);
    if (!task) return;

    if (STATUSES.includes(overId as Task["status"])) {
      const newStatus = overId as Task["status"];
      if (task.status !== newStatus) {
        onUpdateStatus(task.id, newStatus);
      }
    } else {
      const targetTask = tasks.find((t) => String(t.id) === overId);
      if (targetTask && task.status !== targetTask.status) {
        onUpdateStatus(task.id, targetTask.status);
      }
    }
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={(event) => {
          const task = tasks.find(
            (t) => String(t.id) === String(event.active.id)
          );
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
              onTaskClick={(task) => {
                setSelectedTask(task);
                setModalOpen(true);
              }}
              onAddTask={onAddTask}
              selectedProjectId={selectedProjectId}
            />
          ))}
        </div>

        <DragOverlay>
          <KanbanOverlay task={activeTask} />
        </DragOverlay>
      </DndContext>

      {/* Task Editing Modal */}
      <TaskModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSave={(updatedTask: Partial<Task>) => {
          onUpdateTask(updatedTask);
          setModalOpen(false);
        }}
      />
    </>
  );
}
