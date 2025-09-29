import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@shared/types";
import { SquarePen, Trash2 } from "lucide-react";

interface KanbanTaskProps {
  task: Task;
  onDelete?: (id: string) => void;
  onUpdatePriority: (id: string, priority: Task["priority"]) => void;
  onUpdateStatus: (id: string, status: Task["status"]) => void;
  onClick: (task: Task) => void;
}

export function KanbanTask({
  task,
  onDelete,
  onUpdatePriority,
  onUpdateStatus,
  onClick,
}: KanbanTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(task.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-gray-900 rounded-lg shadow p-4 border border-primary"
    >
      {/* Header with Edit button */}
      <div className="flex justify-between items-start">
        <h4 className="font-bold text-white">{task.title}</h4>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onClick(task);
          }}
          className="text-gray-400 hover:text-white cursor-pointer"
          title="Edit Task"
        >
          <SquarePen className="w-5 h-5" />
        </button>
      </div>

      {task.description && (
        <p className="text-sm text-gray-300 mt-1">{task.description}</p>
      )}

      {/* Priority dropdown */}
      <div className="mt-3">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Priority
        </label>
        <select
          onPointerDown={(e) => e.stopPropagation()}
          value={task.priority?.trim() || "low"}
          onChange={(e) =>
            onUpdatePriority(task.id, e.target.value as Task["priority"])
          }
          className="appearance-none w-full bg-gray-800 border border-primary text-white rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {/* Status dropdown */}
      <div className="mt-3">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Status
        </label>
        <select
          onPointerDown={(e) => e.stopPropagation()}
          value={task.status}
          onChange={(e) =>
            onUpdateStatus(task.id, e.target.value as Task["status"])
          }
          className="appearance-none w-full bg-gray-800 border border-primary text-white rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="todo">Todo</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      {/* Due Date */}
      <span
        onPointerDown={(e) => e.stopPropagation()}
        className="text-xs text-gray-400 mt-3 select-text cursor-text block"
      >
        Due: {task.dueDate || "—"}
      </span>

      {/* Delete button */}
      <div className="mt-4">
        {
          onDelete && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="flex items-center gap-1 bg-primary hover:bg-primary-dark text-white text-sm font-medium px-3 py-1.5 rounded-md shadow transition-colors cursor-pointer"
          title="Delete Task"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete</span>
        </button>
          )
        }
      </div>
    </div>
  );
}
