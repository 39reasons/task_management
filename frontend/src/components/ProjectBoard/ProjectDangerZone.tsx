import { Loader2, LogOut, Trash2 } from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface DeleteState {
  isDeleteSectionOpen: boolean;
  toggleDeleteSection: () => void;
  deleteConfirmation: string;
  setDeleteConfirmation: (value: string) => void;
  deleteError: string | null;
  isDeleting: boolean;
  deleteProject: () => void | Promise<void>;
}

interface ProjectDangerZoneProps {
  projectName: string;
  deleteState: DeleteState;
  disableActions?: boolean;
  onLeaveProject?: () => void | Promise<void>;
  leaveError?: string | null;
  leaveLoading?: boolean;
}

export function ProjectDangerZone({
  projectName,
  deleteState,
  disableActions = false,
  onLeaveProject,
  leaveError,
  leaveLoading,
}: ProjectDangerZoneProps) {
  return (
    <div className="space-y-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-3">
      {leaveError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {leaveError}
        </div>
      ) : null}

      {onLeaveProject ? (
        <Button
          type="button"
          variant="ghost"
          className="flex w-full items-center justify-between text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onLeaveProject()}
          disabled={Boolean(leaveLoading) || disableActions}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <LogOut className="h-4 w-4" />
            Leave project
          </span>
          <span className="text-xs">{leaveLoading ? "Leaving…" : "Confirm"}</span>
        </Button>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        className="flex w-full items-center justify-between text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={deleteState.toggleDeleteSection}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Trash2 className="h-4 w-4" />
          Delete
        </span>
        <span className="text-xs">{deleteState.isDeleteSectionOpen ? "Hide" : "Show"}</span>
      </Button>

      {deleteState.isDeleteSectionOpen ? (
        <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 shadow-[0_0_0_1px_rgba(220,38,38,0.08)]">
          <p className="text-xs text-destructive/80">
            Deleting <span className="font-semibold">{projectName}</span> is permanent and removes all of its tasks.
          </p>
          <div className="space-y-2">
            <Label htmlFor="project-delete-confirm" className="text-xs font-medium text-destructive">
              Type delete to confirm
            </Label>
            <Input
              id="project-delete-confirm"
              value={deleteState.deleteConfirmation}
              onChange={(event) => deleteState.setDeleteConfirmation(event.target.value)}
              placeholder="delete"
              disabled={disableActions || deleteState.isDeleting}
              className="border border-destructive/40 focus-visible:ring-destructive"
            />
          </div>
          {deleteState.deleteError ? (
            <p className="text-xs text-destructive">{deleteState.deleteError}</p>
          ) : null}
          <Button
            type="button"
            variant="destructive"
            className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
            disabled={
              disableActions ||
              deleteState.isDeleting ||
              deleteState.deleteConfirmation.trim().toLowerCase() !== "delete"
            }
            onClick={() => deleteState.deleteProject()}
          >
            {deleteState.isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete project
          </Button>
        </div>
      ) : null}
    </div>
  );
}
