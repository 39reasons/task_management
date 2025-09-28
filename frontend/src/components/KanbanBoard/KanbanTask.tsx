import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@shared/types";

interface KanbanTaskProps {
  task: Task;
  onDelete: (id: string) => void;
  onUpdatePriority: (id: string, priority: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
}

export function KanbanTask({
  task,
  onDelete,
  onUpdatePriority,
  onUpdateStatus,
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
    opacity: isDragging ? 0 : 1, // hide original card while dragging (overlay shows)
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-gray-900 rounded-lg shadow p-4 border border-primary cursor-grab"
    >
      <h4 className="font-bold text-white">{task.title}</h4>
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
          onChange={(e) => onUpdatePriority(task.id, e.target.value)}
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
          onChange={(e) => onUpdateStatus(task.id, e.target.value)}
          className="appearance-none w-full bg-gray-800 border border-primary text-white rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="todo">Todo</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Due: {task.dueDate || "—"}
      </p>

      <div className="mt-4">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onDelete(task.id)}
          className="bg-primary hover:bg-primary-dark text-white text-sm font-medium px-3 py-1.5 rounded-md shadow transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
