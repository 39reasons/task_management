import type { Task } from "@shared/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties } from "react";
import { Calendar, X } from "lucide-react";

interface KanbanTaskProps {
  task: Task;
  onClick: (task: Task) => void;
  onDelete?: (id: string) => void;
  disableDrag?: boolean;
}

export function KanbanTask({ task, onClick, onDelete, disableDrag = false }: KanbanTaskProps) {
  const sortable = useSortable({ id: task.id, disabled: disableDrag });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    cursor: "grab",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative mb-3 rounded-xl border border-gray-700/70 bg-gradient-to-br from-gray-900 to-gray-900/90 p-3 shadow-sm transition hover:border-blue-500/80 hover:shadow-lg"
      onClick={() => onClick(task)}
    >
      {/* Delete icon */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="absolute top-2 right-2 hidden rounded-md p-1 text-gray-400 transition hover:bg-gray-800/70 hover:text-red-400 group-hover:block"
          aria-label="Delete card"
        >
          <X size={16} />
        </button>
      )}

      {/* Tags at top */}
      {task.tags?.length ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {task.tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white/90"
              style={{ backgroundColor: tag.color ?? "#4b5563" }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      ) : null}

      {/* Title */}
      <h4 className="mb-2 pr-8 text-sm font-semibold text-white">
        {task.title}
      </h4>

      {/* Due date */}
      {task.due_date && (
        <div className="flex items-center gap-1 text-xs text-blue-300">
          <Calendar size={12} />
          <span>{task.due_date}</span>
        </div>
      )}
    </div>
  );
}
