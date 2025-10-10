import type { Stage, Task } from "@shared/types";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import type { CSSProperties } from "react";
import { KanbanTask } from "./KanbanTask";
import { TaskForm } from "../TaskForm";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";

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
  columnHeight?: number | null;
}

export function KanbanColumn({
  stage,
  onDelete,
  onTaskClick,
  onAddTask,
  onDeleteStage,
  dragHandleProps,
  columnHeight,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: stage.id });
  const orderedTasks = [...stage.tasks].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0)
  );
  const cardStyle: CSSProperties | undefined =
    typeof columnHeight === "number"
      ? {
          height: columnHeight,
          maxHeight: columnHeight,
        }
      : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={cardStyle}
      className="flex min-h-[18rem] max-h-[calc(100vh-12rem)] min-w-[280px] w-[280px] flex-shrink-0 flex-col overflow-hidden border border-border bg-card shadow-sm"
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-2">
        <CardTitle className="flex-1 min-w-0 text-sm font-semibold text-foreground">
          <button
            type="button"
            ref={dragHandleProps?.setActivatorNodeRef}
            {...(dragHandleProps?.attributes ?? {})}
            {...(dragHandleProps?.listeners ?? {})}
            className="flex w-full cursor-grab items-center justify-between text-left"
            aria-label={`Move ${stage.name}`}
          >
            <span className="truncate">{stage.name}</span>
          </button>
        </CardTitle>
        {onDeleteStage ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDeleteStage(stage.id)}
            aria-label={`Delete ${stage.name}`}
          >
            <X size={16} />
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-1 min-h-0 flex-col overflow-hidden p-0">
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-0 styled-scrollbars">
          <SortableContext
            items={orderedTasks.map((task) => String(task.id))}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 pb-6">
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
        </div>

        {onAddTask ? (
          <div className="border-t border-border/60 px-4 pb-4 pt-3 [&>div]:mt-0">
            <TaskForm stageId={stage.id} onAdd={onAddTask} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
