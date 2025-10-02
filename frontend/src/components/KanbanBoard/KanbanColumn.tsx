import type { Stage, Task } from "@shared/types";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
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
  const orderedTasks = [...stage.tasks].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0)
  );

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
            onClick={() => onDeleteStage(stage.id)}
          >
            <X size={16} />
          </button>
        )}
      </div>

      <SortableContext
        items={orderedTasks.map((task) => String(task.id))}
        strategy={verticalListSortingStrategy}
      >
        <div>
          {orderedTasks.map((task) => (
            <KanbanTask
              key={task.id}
              task={task}
              onDelete={onDelete}
              onClick={onTaskClick}
            />
          ))}
        </div>
      </SortableContext>

      {onAddTask && (
        <TaskForm stageId={stage.id} onAdd={onAddTask} />
      )}
    </div>
  );
}
