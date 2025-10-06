import type { Stage, Task } from "@shared/types";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { DraggableAttributes } from "@dnd-kit/core";
import type {
  SyntheticListenerMap,
} from "@dnd-kit/core/dist/hooks/utilities";
import { KanbanTask } from "./KanbanTask";
import { TaskForm } from "../TaskForm";
import { X } from "lucide-react";

interface KanbanColumnProps {
  stage: Stage & { tasks: Task[] };
  onDelete?: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onAddTask?: (stage_id: string, title: string) => void;
  onDeleteStage?: (stage_id: string) => void;
  dragHandleProps?: {
    attributes?: DraggableAttributes;
    listeners?: SyntheticListenerMap;
    setActivatorNodeRef?: (node: HTMLElement | null) => void;
  };
}

export function KanbanColumn({
  stage,
  onDelete,
  onTaskClick,
  onAddTask,
  onDeleteStage,
  dragHandleProps,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: stage.id });
  const orderedTasks = [...stage.tasks].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0)
  );

  return (
    <div
      ref={setNodeRef}
      className="min-w-[280px] w-[280px] flex-shrink-0 bg-gray-800 rounded-lg p-4 shadow border border-gray-700"
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <button
          type="button"
          ref={dragHandleProps?.setActivatorNodeRef}
          {...(dragHandleProps?.attributes ?? {})}
          {...(dragHandleProps?.listeners ?? {})}
          className="flex-1 min-w-0 overflow-hidden break-all text-left text-sm font-semibold text-white leading-snug cursor-grab"
          aria-label={`Move ${stage.name}`}
        >
          {stage.name}
        </button>
        {onDeleteStage && (
          <button
            type="button"
            aria-label={`Delete ${stage.name}`}
            className="text-gray-400 hover:text-red-400 flex-shrink-0"
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
