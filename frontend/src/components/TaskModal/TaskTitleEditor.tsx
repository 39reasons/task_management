import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback } from "react";
import { CornerDownLeft } from "lucide-react";

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
        className="w-full rounded-xl border border-transparent px-4 py-2 text-left text-xl font-bold leading-tight text-white transition hover:border-gray-600 hover:bg-gray-900/70 break-all"
      >
        {title}
      </button>
    );
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-gray-600/60 bg-gray-900/80 px-4 py-2 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30">
      <input
        type="text"
        value={title}
        autoFocus
        onChange={(event) => onChange(event.target.value)}
        onBlur={onCommit}
        onKeyDown={handleKeyDown}
        className="flex-1 bg-transparent text-xl font-bold leading-tight text-white focus:outline-none"
        maxLength={maxLength}
      />
      <button
        type="button"
        onClick={onCommit}
        disabled={!canCommit}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
          canCommit
            ? "text-blue-300 hover:bg-blue-500/10 border-transparent"
            : "border-transparent text-gray-500"
        }`}
        aria-label="Save title"
      >
        <CornerDownLeft size={16} />
      </button>
    </div>
  );
}
