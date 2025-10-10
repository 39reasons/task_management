import type { Task } from "@shared/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties } from "react";
import { Calendar, X } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

interface KanbanTaskProps {
  task: Task;
  onClick: (task: Task) => void;
  onDelete?: (id: string) => void;
  disableDrag?: boolean;
}

export function KanbanTask({ task, onClick, onDelete, disableDrag = false }: KanbanTaskProps) {
  const sortable = useSortable({ id: task.id, disabled: disableDrag });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    cursor: "grab",
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative cursor-grab border border-border bg-card p-3 text-left shadow-sm transition hover:border-primary/30 hover:shadow-md",
        isDragging && "opacity-70"
      )}
      onClick={() => onClick(task)}
    >
      {onDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(task.id);
          }}
          className="absolute right-2 top-2 hidden h-7 w-7 text-muted-foreground hover:text-destructive group-hover:flex"
          aria-label="Delete card"
        >
          <X size={16} />
        </Button>
      ) : null}

      {task.tags?.length ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {task.tags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="border border-transparent text-xs font-medium uppercase tracking-wide text-primary-foreground shadow-sm"
              style={{ backgroundColor: tag.color ?? "#4b5563" }}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      ) : null}

      <h4 className="mb-2 pr-8 text-sm font-semibold leading-snug text-foreground">
        {task.title}
      </h4>

      {task.due_date ? (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar size={12} />
          <span>{task.due_date}</span>
        </div>
      ) : null}
    </Card>
  );
}
