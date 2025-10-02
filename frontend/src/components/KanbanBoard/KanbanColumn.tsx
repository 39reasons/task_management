import type { Stage, Task } from "@shared/types";
import { useDroppable } from "@dnd-kit/core";
import { KanbanTask } from "./KanbanTask";
import { TaskForm } from "../TaskForm";
import { X } from "lucide-react";

interface KanbanColumnProps {
  stage: Stage & { tasks: Task[] };
  onDelete?: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onAddTask?: (stage_id: string, title: string) => void;
  onDeleteStage?: (stage_id: string) => void;
}

export function KanbanColumn({
  stage,
  onDelete,
  onTaskClick,
  onAddTask,
  onDeleteStage,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className="bg-gray-800 rounded-lg p-4 shadow border border-gray-700"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-white">{stage.name}</h3>
        {onDeleteStage && (
          <button
            type="button"
            aria-label={`Delete ${stage.name}`}
            className="text-gray-400 hover:text-red-400"
            onClick={() => {
              const shouldDelete = stage.tasks.length === 0
                ? true
                : window.confirm(
                    `Delete stage "${stage.name}"? This will remove ${stage.tasks.length} task${stage.tasks.length === 1 ? "" : "s"}.`
                  );
              if (!shouldDelete) return;
              onDeleteStage(stage.id);
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

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
