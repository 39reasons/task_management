import type { Task } from "@shared/types";

interface KanbanOverlayProps {
  task: Task | null;
}

export function KanbanOverlay({ task }: KanbanOverlayProps) {
  if (!task) return null;
  return (
    <div className="rounded-lg shadow-lg p-3 bg-gray-700 border border-gray-600">
      <h3 className="text-white font-medium text-sm">{task.title}</h3>
    </div>
  );
}
