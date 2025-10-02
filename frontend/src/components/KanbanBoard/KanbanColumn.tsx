import type { Stage, Task } from "@shared/types";
import { useDroppable } from "@dnd-kit/core";
import { KanbanTask } from "./KanbanTask";
import { TaskForm } from "../TaskForm";

interface KanbanColumnProps {
  stage: Stage & { tasks: Task[] };
  onDelete?: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onAddTask?: (stage_id: string, title: string) => void;
}

export function KanbanColumn({
  stage,
  onDelete,
  onTaskClick,
  onAddTask,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className="bg-gray-800 rounded-lg p-4 shadow border border-gray-700"
    >
      <h3 className="font-semibold text-white mb-3">{stage.name}</h3>

      <div>
        {stage.tasks.map((task) => (
          <KanbanTask
            key={task.id}
            task={task}
            onDelete={onDelete}
            onClick={onTaskClick}
          />
        ))}
      </div>

      {onAddTask && (
        <TaskForm stageId={stage.id} onAdd={onAddTask} />
      )}
    </div>
  );
}
