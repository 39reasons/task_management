import { useEffect, useMemo, useState } from "react";
import type { Task } from "@shared/types";
import { useModal } from "./ModalStack";
import { DateCalendar } from "./DateCalendar";

interface DueDateModalProps {
  task: Task | null;
  currentDueDate: string;
  onSave: (date: string | null) => Promise<void> | void;
}

export function DueDateModal({ task, currentDueDate, onSave }: DueDateModalProps) {
  const { modals, closeModal } = useModal();
  const isOpen = modals.includes("due-date");

  const [dateValue, setDateValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const initial = currentDueDate ? currentDueDate.slice(0, 10) : "";
    setDateValue(initial);
    setError(null);
  }, [isOpen, currentDueDate]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      closeModal("due-date");
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [isOpen, closeModal]);

  const hasSelection = Boolean(dateValue);
  const hasChanges = useMemo(() => dateValue !== (currentDueDate ?? ""), [dateValue, currentDueDate]);

  if (!isOpen || !task) return null;

  const handleClose = () => {
    closeModal("due-date");
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(dateValue ? dateValue : null);
      handleClose();
    } catch (err) {
      setError((err as Error).message ?? "Failed to update due date");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
      />

      <div className="relative z-10 w-full max-w-sm space-y-4 rounded-3xl bg-transparent p-0">
        <DateCalendar
          selectedDate={dateValue || null}
          onSelect={(value) => setDateValue(value)}
          onClose={handleClose}
          title="Dates"
        />

        {error && <p className="px-6 text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 px-6 pb-6">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-300 transition hover:bg-gray-800 hover:text-gray-100"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
            disabled={isSaving || !hasSelection || !hasChanges}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
