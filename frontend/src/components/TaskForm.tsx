import { useState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";
interface TaskFormProps {
  stageId: string;
  onAdd: (stage_id: string, title: string) => void;
}

const TASK_TITLE_MAX_LENGTH = 512;

export function TaskForm({ stageId, onAdd }: TaskFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const textarea_ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open && textarea_ref.current) textarea_ref.current.focus();
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
    <div className="mt-3">
      {!open ? (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setOpen(true)}
          className="w-full rounded-xl border border-dashed border-gray-600/60 bg-gray-900/70 px-3 py-2 text-left transition hover:border-blue-500 hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
              <Plus className="h-4 w-4" />
            </span>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Add card</p>
              <p className="text-xs text-gray-400">Capture a task in this stage</p>
            </div>
          </div>
        </button>
      ) : (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="rounded-xl border border-gray-700/70 bg-gray-900/95 p-4 shadow-xl"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">New card</p>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTitle("");
              }}
              className="rounded-md p-1 text-gray-400 transition hover:bg-gray-800 hover:text-gray-100"
              aria-label="Cancel adding card"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <textarea
            ref={textarea_ref}
            value={title}
            onChange={(e) =>
              setTitle(e.target.value.slice(0, TASK_TITLE_MAX_LENGTH))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handle_submit();
              } else if (e.key === "Escape") {
                setOpen(false);
                setTitle("");
              }
            }}
            placeholder="Describe the task… Press Enter to add, Esc to cancel"
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            maxLength={TASK_TITLE_MAX_LENGTH}
          />
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={handle_submit}
              disabled={!title.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" />
              Add card
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTitle("");
              }}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-300 transition hover:bg-gray-800 hover:text-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
