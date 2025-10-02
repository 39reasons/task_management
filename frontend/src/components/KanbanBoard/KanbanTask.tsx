import type { Task } from "@shared/types";
import { useDraggable } from "@dnd-kit/core";

interface KanbanTaskProps {
  task: Task;
  onClick: (task: Task) => void;
  onDelete?: (id: string) => void;
  onUpdatePriority?: (id: string, priority: Task["priority"]) => void;
  onUpdateStatus?: (id: string, status: Task["status"]) => void;
}

export function KanbanTask({
  task,
  onClick,
  onDelete,
}: KanbanTaskProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
    });

  const style = {
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-gray-900 rounded-lg p-3 mb-3 shadow cursor-pointer border border-gray-700 hover:border-gray-500 transition"
      onClick={() => onClick(task)}
    >
      {/* Task title */}
      <h4 className="text-white font-semibold mb-2">{task.title}</h4>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.map((tag) => (
            <span
              key={tag.id}
              className="px-2 py-0.5 rounded text-xs font-medium text-white"
              style={{
                backgroundColor: tag.color ?? "#4b5563",
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Optional extra info */}
      {task.due_date && (
        <p className="text-xs text-gray-400">Due: {task.due_date}</p>
      )}

      {/* Example: delete button if handler passed in */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="mt-2 text-xs text-red-400 hover:text-red-300"
        >
          Delete
        </button>
      )}
    </div>
  );
}
