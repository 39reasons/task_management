import { useState, useRef, useEffect } from "react";
import { Plus, CornerDownLeft } from "lucide-react";
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
    <div ref={containerRef} className="mt-3">
      {!open ? (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setOpen(true)}
          className="group w-full rounded-2xl border border-dashed border-gray-600/60 bg-gray-900/70 px-4 py-3 text-left transition hover:border-blue-500 hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
              <Plus className="h-4 w-4" />
            </span>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Add card</p>
              <p className="text-xs text-gray-400">Capture a task in this stage</p>
            </div>
          </div>
        </button>
      ) : (
        <form
          onPointerDown={(e) => e.stopPropagation()}
          onSubmit={(e) => {
            e.preventDefault();
            handle_submit();
          }}
          className="group w-full rounded-2xl border border-dashed border-blue-500/70 bg-gray-900/80 px-4 py-3 text-left shadow focus-within:border-blue-500"
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={title}
              onChange={(e) =>
                setTitle(e.target.value.slice(0, TASK_TITLE_MAX_LENGTH))
              }
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false);
                  setTitle("");
                }
              }}
              placeholder="Add card title…"
              className="w-full border-0 bg-transparent text-sm text-white placeholder-gray-500 focus:border-0 focus:outline-none"
              maxLength={TASK_TITLE_MAX_LENGTH}
            />
            <button
              type="button"
              onClick={() => {
                if (title.trim()) {
                  handle_submit();
                }
              }}
              disabled={!title.trim()}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
                title.trim()
                  ? "text-blue-400 hover:bg-blue-500/10 border-transparent"
                  : "border-transparent text-gray-600"
              }`}
              aria-label="Add card"
            >
              <CornerDownLeft size={16} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
