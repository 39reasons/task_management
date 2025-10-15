import { useState, useRef, useEffect } from "react";
import { Plus, CornerDownLeft } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { cn } from "../../lib/utils";
interface TaskFormProps {
  stageId: string;
  onAdd: (stage_id: string, title: string) => void;
}

const TASK_TITLE_MAX_LENGTH = 512;

export function TaskForm({ stageId, onAdd }: TaskFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!open) return;
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setTitle("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handle_submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (trimmed.length > TASK_TITLE_MAX_LENGTH) return;
    onAdd(stageId, trimmed);
    setTitle("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="mt-2">
      {!open ? (
        <Button
          type="button"
          variant="ghost"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setOpen(true)}
          className="group flex w-full items-center justify-start gap-3 rounded-2xl border border-dashed border-border/60 bg-transparent px-5 py-8 text-left transition hover:border-primary/40 hover:bg-muted/20"
        >
          <span className="flex h-5 w-5 items-center justify-center text-primary">
            <Plus className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <span className="flex flex-col text-left">
            <span className="text-sm font-semibold text-foreground">Add card</span>
            <span className="text-xs text-muted-foreground">Capture a task in this stage</span>
          </span>
        </Button>
      ) : (
        <form
          onPointerDown={(e) => e.stopPropagation()}
          onSubmit={(e) => {
            e.preventDefault();
            handle_submit();
          }}
          className="flex items-center gap-2 rounded-lg border border-primary/40 bg-muted/30 px-3 py-2 shadow-sm focus-within:border-primary"
        >
          <Input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, TASK_TITLE_MAX_LENGTH))}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                setTitle("");
              }
            }}
            placeholder="Add card title…"
            className="flex-1 border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            maxLength={TASK_TITLE_MAX_LENGTH}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => {
              if (title.trim()) {
                handle_submit();
              }
            }}
            disabled={!title.trim()}
            className={cn(
              "h-8 w-8 rounded-full text-muted-foreground",
              title.trim() && "text-primary hover:bg-primary/10"
            )}
            aria-label="Add card"
          >
            <CornerDownLeft className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}
