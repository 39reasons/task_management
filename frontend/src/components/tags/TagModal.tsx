import { useCallback, useEffect, useState } from "react";
import { useMutation } from "@apollo/client";
import type { Task, Tag } from "@shared/types";
import { ASSIGN_TAG_TO_TASK, REMOVE_TAG_FROM_TASK } from "../../graphql";
import { useModal } from "../ModalStack";
import { COLOR_WHEEL } from "../../constants/colors";
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ScrollArea,
} from "../ui";
import { cn } from "../../lib/utils";
import { TagEditorDialog, TagEditorState } from "./TagEditorDialog";
import { useProjectTagQueries } from "../../hooks/useProjectTagQueries";
import { useTagSelection } from "../../hooks/useTagSelection";

interface TagModalProps {
  task: Task | null;
}

const DEFAULT_COLOR = COLOR_WHEEL[8];

export function TagModal({ task }: TagModalProps) {
  const { modals, openModal, closeModal } = useModal();
  const isOpen = modals.includes("tag");

  const projectId = task?.project_id ?? null;
  const taskId = task?.id ?? null;

  const {
    projectTags,
    loadingProjectTags,
    assignedTagIds,
    refetchProjectTags,
    refetchTaskTags,
    refetchAll,
  } = useProjectTagQueries(projectId, taskId);

  const [editorState, setEditorState] = useState<TagEditorState | null>(null);

  const [assignTagToTask] = useMutation(ASSIGN_TAG_TO_TASK);
  const [removeTagFromTask] = useMutation(REMOVE_TAG_FROM_TASK);

  const {
    selectedTagIds,
    toggleTagSelection,
    selectTag,
    hasSelectionChanged,
    applySelection,
    isApplying,
    actionError,
  } = useTagSelection({
    taskId,
    assignedTagIds,
    assignTag: assignTagToTask,
    removeTag: removeTagFromTask,
    onAfterMutations: refetchAll,
  });

  const openEditor = useCallback(
    (state: TagEditorState) => {
      setEditorState(state);
      openModal("tag-editor");
    },
    [openModal]
  );

  const closeEditor = useCallback(() => {
    setEditorState(null);
    closeModal("tag-editor");
  }, [closeModal]);

  const closeTagModal = useCallback(() => {
    closeEditor();
    closeModal("tag");
  }, [closeEditor, closeModal]);

  useEffect(() => {
    if (!isOpen || !projectId) return;
    refetchProjectTags().catch(() => undefined);
  }, [isOpen, projectId, refetchProjectTags]);

  const shouldRender = Boolean(isOpen && task && projectId);

  const handleApplySelection = async () => {
    const shouldClose = await applySelection();
    if (shouldClose) {
      closeTagModal();
    }
  };

  const handleEditorComplete = async (updatedTag: Tag, mode: TagEditorState["mode"]) => {
    await refetchProjectTags();
    const tagWasSelected = selectedTagIds.has(updatedTag.id);

    if (mode === "create") {
      selectTag(updatedTag.id);
    }

    if (tagWasSelected) {
      await refetchTaskTags();
    }

    closeEditor();
  };

  if (!shouldRender || !task || !projectId) return null;

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      closeTagModal();
    }
  };

  const isEditorOpen = modals.includes("tag-editor") && Boolean(editorState);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg space-y-4">
          <DialogHeader>
            <DialogTitle>Manage tags</DialogTitle>
            <DialogDescription>
              Apply existing tags to this task or create a new one.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {projectTags.length} tags available
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => openEditor({ mode: "create" })}
            >
              New Tag
            </Button>
          </div>

          <ScrollArea className="max-h-72 rounded-md border border-border bg-card">
            <div className="space-y-2 p-3">
              {loadingProjectTags ? (
                <p className="text-sm text-muted-foreground">Loading tags…</p>
              ) : projectTags.length ? (
                projectTags.map((tag) => {
                  const displayColor = tag.color || DEFAULT_COLOR;
                  const isChecked = selectedTagIds.has(tag.id);

                  return (
                    <div
                      key={tag.id}
                      className={cn(
                        "flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 transition hover:border-primary/20 hover:bg-muted/40",
                        isChecked && "border-primary/40 bg-primary/5"
                      )}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleTagSelection(tag.id)}
                        aria-label={`Toggle ${tag.name}`}
                      />
                      <div className="flex flex-1 items-center justify-between gap-3">
                        <Badge
                          className="flex items-center gap-2 border-none px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary"
                          style={{ backgroundColor: displayColor }}
                        >
                          {tag.name}
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditor({ mode: "edit", tag })}
                          className="h-7 px-3 text-xs"
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  No tags yet. Create one to get started.
                </p>
              )}
            </div>
          </ScrollArea>

          {actionError ? (
            <p className="text-sm text-destructive">{actionError}</p>
          ) : null}

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={closeTagModal}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApplySelection}
              disabled={isApplying || !hasSelectionChanged}
            >
              {isApplying ? "Saving…" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editorState && (
        <TagEditorDialog
          open={isEditorOpen}
          state={editorState}
          projectId={projectId}
          onCancel={closeEditor}
          onComplete={(tag) => handleEditorComplete(tag, editorState.mode)}
        />
      )}
    </>
  );
}
