import type { Task } from "@shared/types";
import { useDraggable } from "@dnd-kit/core";
import { X } from "lucide-react";

interface KanbanTaskProps {
  task: Task;
  onClick: (task: Task) => void;
  onDelete?: (id: string) => void;
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

  if (isDragging) return null;

  const style = {
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    cursor: "default",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative bg-gray-900 rounded-lg p-3 mb-3 shadow border border-gray-700 hover:border-gray-500 transition"
      onClick={() => onClick(task)}
    >
      {/* Delete icon */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="absolute top-2 right-2 text-gray-400 hover:text-red-400 cursor-pointer"
        >
          <X size={16} />
        </button>
      )}

      {/* Tags at top */}
      {task.tags?.length ? (
<div className="flex flex-wrap gap-2 mb-2">
  {task.tags.map((tag) => (
    <span
      key={tag.id}
      className="px-4 py-1 rounded text-sm font-medium text-white"
      style={{ backgroundColor: tag.color ?? "#4b5563" }}
    >
    </span>
  ))}
</div>
      ) : null}

      {/* Title */}
      <h4 className="text-white font-semibold mb-2 pr-6">{task.title}</h4>

      {/* Due date */}
      {task.due_date && (
        <p className="text-xs text-gray-400">Due: {task.due_date}</p>
      )}
    </div>
  );
}
