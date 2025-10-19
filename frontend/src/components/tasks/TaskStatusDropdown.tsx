import { Check, ChevronDown, Loader2 } from "lucide-react";
import type { TaskStatus } from "@shared/types";
import { TASK_STATUS_OPTIONS, DEFAULT_TASK_STATUS } from "../../constants/taskStatus";
import { cn } from "../../lib/utils";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui";

type TaskStatusDropdownProps = {
  value: TaskStatus | null | undefined;
  onChange: (next: TaskStatus) => void;
  isUpdating?: boolean;
  disabled?: boolean;
  align?: "start" | "center" | "end";
  triggerClassName?: string;
  contentClassName?: string;
};

export function TaskStatusDropdown({
  value,
  onChange,
  isUpdating = false,
  disabled = false,
  align = "start",
  triggerClassName,
  contentClassName,
}: TaskStatusDropdownProps) {
  const currentStatus =
    TASK_STATUS_OPTIONS.find((option) => option.value === value) ?? DEFAULT_TASK_STATUS;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || isUpdating}
          className={cn(
            "inline-flex min-w-[9rem] items-center justify-between gap-2 rounded-full border-border/70 bg-background/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground hover:border-primary/40 hover:text-primary",
            triggerClassName
          )}
          aria-busy={isUpdating}
        >
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${currentStatus.dotClass}`} />
            {currentStatus.label}
          </span>
          {isUpdating ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className={cn("w-44", contentClassName)}>
        {TASK_STATUS_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => {
              if (isUpdating || option.value === value || disabled) return;
              onChange(option.value);
            }}
            className="flex items-center justify-between gap-2 hover:bg-accent hover:text-accent-foreground/90 focus:bg-accent focus:text-accent-foreground"
          >
            <span className="flex items-center gap-2 text-sm">
              <span className={`h-2 w-2 rounded-full ${option.dotClass}`} />
              {option.label}
            </span>
            {option.value === value ? <Check className="h-3.5 w-3.5 text-foreground" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
