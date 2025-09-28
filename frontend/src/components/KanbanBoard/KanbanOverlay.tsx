import type { Task } from "@shared/types";

export function KanbanOverlay({ task }: { task: Task | null }) {
  if (!task) return null;
  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-4 border-2 border-primary opacity-90">
      <h4 className="font-bold text-white">{task.title}</h4>
      {task.description && (
        <p className="text-sm text-gray-300 mt-1">{task.description}</p>
      )}
      <p className="text-xs text-gray-400 mt-3">
        Due: {task.dueDate || "—"}
      </p>
    </div>
  );
}
