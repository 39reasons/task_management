import type { Task } from "@shared/types";
import { useDraggable } from "@dnd-kit/core";

interface KanbanTaskProps {
  task: Task;
  onClick: (task: Task) => void;
}

export function KanbanTask({ task, onClick }: KanbanTaskProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (!isDragging) onClick(task);
      }}
      className={`rounded-lg shadow-sm p-3 mb-3 cursor-grab active:cursor-grabbing transition-colors bg-gray-700 border border-gray-600 hover:bg-gray-600 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <h3 className="text-white font-medium text-sm">{task.title}</h3>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-300">
        {task.priority && (
          <span className="px-2 py-0.5 rounded bg-gray-800 border border-gray-700">
            {task.priority}
          </span>
        )}
        {task.dueDate && (
          <span className="px-2 py-0.5 rounded bg-gray-800 border border-gray-700">
            Due {task.dueDate}
          </span>
        )}
        {task.assignedTo && (
          <span className="px-2 py-0.5 rounded bg-gray-800 border border-gray-700">
            Assigned
          </span>
        )}
      </div>
    </div>
  );
}
