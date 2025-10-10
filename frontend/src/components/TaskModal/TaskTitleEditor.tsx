import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback } from "react";
import { CornerDownLeft } from "lucide-react";
import { Button } from "../ui";
import { cn } from "../../lib/utils";

interface TaskTitleEditorProps {
  title: string;
  isEditing: boolean;
  canCommit: boolean;
  maxLength: number;
  onStartEdit: () => void;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

export function TaskTitleEditor({
  title,
  isEditing,
  canCommit,
  maxLength,
  onStartEdit,
  onChange,
  onCommit,
  onCancel,
}: TaskTitleEditorProps) {
  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onCommit();
      } else if (event.key === "Escape") {
        onCancel();
      }
    },
    [onCommit, onCancel]
  );

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={onStartEdit}
        className="w-full break-all rounded-lg border border-transparent px-4 py-2 text-left text-xl font-semibold leading-tight text-foreground transition hover:border-border hover:bg-muted"
      >
        {title}
      </button>
    );
  }

  return (
    <div className="mb-2 flex items-center gap-3 rounded-lg border border-border bg-[hsl(var(--card))] px-4 py-2 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
      <input
        type="text"
        value={title}
        autoFocus
        onChange={(event) => onChange(event.target.value)}
        onBlur={onCommit}
        onKeyDown={handleKeyDown}
        className="flex-1 bg-transparent text-xl font-semibold leading-tight text-foreground focus:outline-none"
        maxLength={maxLength}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={onCommit}
        disabled={!canCommit}
        className={cn(
          "h-8 w-8 rounded-full border border-transparent text-muted-foreground",
          canCommit && "text-primary hover:border-primary/40 hover:bg-primary/10"
        )}
        aria-label="Save title"
      >
        <CornerDownLeft size={16} />
      </Button>
    </div>
  );
}
