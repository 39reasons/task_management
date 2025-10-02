import { useState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";
import type { Task } from "@shared/types";

interface TaskFormProps {
  status: Task["status"];
  project_id: string;
  onAdd: (title: string, status: Task["status"], project_id: string) => void;
}

export function TaskForm({ status, project_id, onAdd }: TaskFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const textarea_ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open && textarea_ref.current) textarea_ref.current.focus();
  }, [open]);

  const handle_submit = () => {
    if (!title.trim()) return;
    onAdd(title.trim(), status, project_id);
    setTitle("");
    setOpen(false);
  };

  return (
    <div className="mt-3">
      {!open ? (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setOpen(true)}
          className="w-full text-left bg-gray-900 border border-primary/40 text-white/80 
                     hover:bg-gray-800 rounded-lg px-3 py-2 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add a card
        </button>
      ) : (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="bg-gray-900 border border-primary rounded-lg shadow p-4"
        >
          <textarea
            ref={textarea_ref}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handle_submit();
              } else if (e.key === "Escape") {
                setOpen(false);
                setTitle("");
              }
            }}
            placeholder="Enter a title for this card…"
            rows={2}
            className="w-full bg-gray-800 border border-primary text-white rounded-md px-2 py-2 
                       text-sm resize-none focus:ring-2 focus:ring-primary focus:outline-none"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handle_submit}
              disabled={!title.trim()}
              className="bg-primary hover:bg-primary-dark disabled:opacity-50 
                         text-white text-sm font-medium px-3 py-1.5 rounded-md"
            >
              Add card
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setTitle("");
              }}
              className="p-1 hover:bg-gray-800 rounded-md"
            >
              <X className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
