import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import type { Task, Tag } from "@shared/types";
import {
  ADD_TAG,
  ASSIGN_TAG_TO_TASK,
  GET_TASK_TAGS,
  REMOVE_TAG_FROM_TASK,
  UPDATE_TAG,
} from "../graphql";
import { useProjectTags } from "../hooks/useProjectTags";
import { useModal } from "./ModalStack";
import { COLOR_WHEEL } from "../constants/colors";
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
  Input,
  Label,
  ScrollArea,
} from "./ui";
import { cn } from "../lib/utils";

interface TagModalProps {
  task: Task | null;
}

type EditorState = { mode: "create" } | { mode: "edit"; tag: Tag };

const DEFAULT_COLOR = COLOR_WHEEL[8];

export function TagModal({ task }: TagModalProps) {
  const { modals, openModal, closeModal } = useModal();
  const isOpen = modals.includes("tag");

  const projectId = task?.project_id ?? null;

  const { tags: projectTags, loading: loadingProjectTags, refetch: refetchProjectTags } = useProjectTags(projectId);

  const { data: taskTagsData, refetch: refetchTaskTags } = useQuery<{
    task: (Pick<Task, "id"> & { tags: Tag[] }) | null;
  }>(GET_TASK_TAGS, {
    variables: { task_id: task?.id },
    skip: !task,
  });

  const assignedTagIds = useMemo(() => {
    const current = taskTagsData?.task?.tags ?? [];
    return new Set(current.map((tag) => tag.id));
  }, [taskTagsData]);

  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const [assignTagToTask] = useMutation(ASSIGN_TAG_TO_TASK);
  const [removeTagFromTask] = useMutation(REMOVE_TAG_FROM_TASK);

  const openEditor = useCallback(
    (state: EditorState) => {
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
    if (!isOpen) return;
    if (taskTagsData?.task?.tags) {
      setSelectedTagIds(new Set(taskTagsData.task.tags.map((tag) => tag.id)));
    } else {
      setSelectedTagIds(new Set());
    }
  }, [isOpen, taskTagsData]);

  useEffect(() => {
    if (!isOpen || !projectId) return;
    refetchProjectTags().catch(() => undefined);
  }, [isOpen, projectId, refetchProjectTags]);

  const shouldRender = Boolean(isOpen && task && projectId);

  const toggleTagSelection = (tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  const handleApplySelection = async () => {
    if (!task) return;

    const initialIds = new Set(assignedTagIds);
    const selectedIds = Array.from(selectedTagIds);

    const toAssign = selectedIds.filter((id) => !initialIds.has(id));
    const toRemove = Array.from(initialIds).filter((id) => !selectedTagIds.has(id));

    if (!toAssign.length && !toRemove.length) {
      closeTagModal();
      return;
    }

    setActionError(null);
    setIsApplying(true);

    try {
      for (const tagId of toAssign) {
        await assignTagToTask({ variables: { task_id: task.id, tag_id: tagId } });
      }

      for (const tagId of toRemove) {
        await removeTagFromTask({ variables: { task_id: task.id, tag_id: tagId } });
      }

      await refetchTaskTags();
      await refetchProjectTags();
      closeTagModal();
    } catch (error) {
      setActionError((error as Error).message ?? "Failed to update tags");
    } finally {
      setIsApplying(false);
    }
  };

  const hasSelectionChanged = useMemo(() => {
    if (assignedTagIds.size !== selectedTagIds.size) return true;
    for (const id of selectedTagIds) {
      if (!assignedTagIds.has(id)) return true;
    }
    return false;
  }, [assignedTagIds, selectedTagIds]);

  const handleEditorComplete = async (updatedTag: Tag, mode: EditorState["mode"]) => {
    await refetchProjectTags();
    const tagWasSelected = selectedTagIds.has(updatedTag.id);

    if (mode === "create") {
      setSelectedTagIds((prev) => {
        const next = new Set(prev);
        next.add(updatedTag.id);
        return next;
      });
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

interface TagEditorDialogProps {
  open: boolean;
  state: EditorState;
  projectId: string;
  onCancel: () => void;
  onComplete: (tag: Tag) => void;
}

function TagEditorDialog({ open, state, projectId, onCancel, onComplete }: TagEditorDialogProps) {
  const isEdit = state.mode === "edit";
  const referenceTag = isEdit ? state.tag : null;

  const [name, setName] = useState(referenceTag?.name ?? "");
  const [color, setColor] = useState<string>(referenceTag?.color ?? DEFAULT_COLOR);
  const [formError, setFormError] = useState<string | null>(null);

  const palette = useMemo(() => {
    const basePalette = [...COLOR_WHEEL];
    if (referenceTag?.color && !basePalette.includes(referenceTag.color)) {
      return [referenceTag.color, ...basePalette];
    }
    return basePalette;
  }, [referenceTag?.color]);

  const [addTag, { loading: creating }] = useMutation(ADD_TAG);
  const [updateTag, { loading: updating }] = useMutation(UPDATE_TAG);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setFormError("Tag name is required");
      return;
    }

    setFormError(null);

    try {
      if (isEdit && referenceTag) {
        const { data } = await updateTag({
          variables: { id: referenceTag.id, name: trimmedName, color },
        });
        if (data?.updateTag) {
          onComplete(data.updateTag);
        }
      } else {
        const { data } = await addTag({
          variables: { project_id: projectId, name: trimmedName, color },
        });
        if (data?.addTag) {
          onComplete(data.addTag);
        }
      }
    } catch (error) {
      setFormError((error as Error).message ?? "Unable to save tag");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onCancel();
        }
      }}
    >
      <DialogContent className="max-w-sm space-y-4">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit tag" : "Create tag"}</DialogTitle>
          <DialogDescription>
            Set a name and color to help teammates identify this tag quickly.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tag-name-input">Name</Label>
            <Input
              id="tag-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="Marketing"
            />
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Color</span>
            <div className="grid grid-cols-6 gap-2">
              {palette.map((option) => {
                const isSelected = option === color;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setColor(option)}
                    className={cn(
                      "h-9 w-9 rounded-md border border-border/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      isSelected ? "border-primary ring-2 ring-primary/40 ring-offset-2 ring-offset-background" : "hover:border-border"
                    )}
                    style={{ backgroundColor: option }}
                    aria-pressed={isSelected}
                  />
                );
              })}
            </div>
          </div>

          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating || updating}>
              {creating || updating ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
