import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from "../ui";

import type { Sprint } from "@shared/types";
import type { TaskDialogState } from "../../hooks/useBacklogCreation";

export type CreateBacklogTaskDialogProps = Pick<
  TaskDialogState,
  | "open"
  | "onOpenChange"
  | "onSubmit"
  | "title"
  | "description"
  | "onTitleChange"
  | "onDescriptionChange"
  | "onSprintChange"
  | "sprintId"
  | "isSubmitting"
  | "error"
  | "closeDialog"
> & {
  sprints: Sprint[];
};

export function CreateBacklogTaskDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  onSprintChange,
  sprintId,
  isSubmitting,
  error,
  closeDialog,
  sprints,
}: CreateBacklogTaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add backlog task</DialogTitle>
          <DialogDescription>
            Capture work items here before promoting them onto a board.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="backlog-task-title">Title</Label>
            <Input
              id="backlog-task-title"
              value={title}
              onChange={onTitleChange}
              placeholder="e.g. Research customer feedback"
              maxLength={256}
              autoFocus
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="backlog-task-description">Description</Label>
            <Textarea
              id="backlog-task-description"
              value={description}
              onChange={onDescriptionChange}
              placeholder="Optional context for this task"
              className="min-h-[120px]"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="backlog-task-sprint">Sprint</Label>
            <select
              id="backlog-task-sprint"
              value={sprintId}
              onChange={onSprintChange}
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
              disabled={isSubmitting || sprints.length === 0}
            >
              <option value="">No sprint</option>
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </option>
              ))}
            </select>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? "Adding…" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
