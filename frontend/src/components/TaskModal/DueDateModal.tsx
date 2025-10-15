import { useEffect, useMemo, useState } from "react";
import type { Task } from "@shared/types";
import { useModal } from "../ModalStack";
import { DateCalendar } from "./DateCalendar";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui";

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

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="w-full max-w-sm space-y-4 overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Set due date</DialogTitle>
          <DialogDescription>Select a target shipped date for this task.</DialogDescription>
        </DialogHeader>

        <div className="px-6">
          <DateCalendar
            selectedDate={dateValue || null}
            onSelect={(value) => setDateValue(value)}
            onClose={handleClose}
            title="Dates"
          />
        </div>

        {error ? <p className="px-6 text-sm text-destructive">{error}</p> : null}

        <DialogFooter className="gap-2 px-6 pb-6">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || !hasSelection || !hasChanges}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
