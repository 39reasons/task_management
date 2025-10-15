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

import type { BacklogDialogState } from "../../hooks/useBacklogCreation";

export type CreateBacklogDialogProps = Pick<
  BacklogDialogState,
  | "open"
  | "onOpenChange"
  | "onSubmit"
  | "name"
  | "description"
  | "onNameChange"
  | "onDescriptionChange"
  | "isSubmitting"
  | "error"
  | "closeDialog"
>;

export function CreateBacklogDialog({
  open,
  onOpenChange,
  onSubmit,
  name,
  description,
  onNameChange,
  onDescriptionChange,
  isSubmitting,
  error,
  closeDialog,
}: CreateBacklogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create backlog</DialogTitle>
          <DialogDescription>
            Give your backlog a clear name and optional description. You can reorder and refine later.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="backlog-name">Name</Label>
            <Input
              id="backlog-name"
              value={name}
              onChange={onNameChange}
              placeholder="e.g. Product backlog"
              maxLength={120}
              autoFocus
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="backlog-description">Description</Label>
            <Textarea
              id="backlog-description"
              value={description}
              onChange={onDescriptionChange}
              placeholder="Optional context for this backlog"
              className="min-h-[120px]"
              disabled={isSubmitting}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? "Creating…" : "Create backlog"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
