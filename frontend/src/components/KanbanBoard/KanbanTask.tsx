import type { Task } from "@shared/types";
import { useDraggable } from "@dnd-kit/core";

interface KanbanTaskProps {
  task: Task;
  onClick: (task: Task) => void;
  isOverlay?: boolean;
}

export function KanbanTask({ task, onClick, isOverlay = false }: KanbanTaskProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`rounded-lg shadow-sm p-3 mb-3 cursor-pointer transition-colors
        ${isDragging ? "opacity-50" : ""}
        bg-gray-700 border border-gray-600 hover:bg-gray-600`}
      onClick={() => !isOverlay && onClick(task)}
    >
      <h3 className="text-white font-medium text-sm">{task.title}</h3>
    </div>
  );
}
