import type { Task } from "@shared/types";
import { KanbanTask } from "./KanbanTask";

interface KanbanOverlayProps {
  task: Task | null;
}

export function KanbanOverlay({ task }: KanbanOverlayProps) {
  if (!task) return null;

  return (
    <KanbanTask
      task={task}
      onClick={() => {}}
      onDelete={undefined}
      disableDrag
    />
  );
}
