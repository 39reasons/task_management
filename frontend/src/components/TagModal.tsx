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

interface TagModalProps {
  task: Task | null;
}

type EditorState = { mode: "create" } | { mode: "edit"; tag: Tag };

const COLOR_CHOICES = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#10b981",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#808080",
];

const DEFAULT_COLOR = COLOR_CHOICES[5];

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
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !isOpen) return;
      const topModal = modals[modals.length - 1];
      if (topModal === "tag") {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") {
          e.stopImmediatePropagation();
        }
        closeTagModal();
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [isOpen, modals, closeTagModal]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={(e) => {
          e.stopPropagation();
          closeTagModal();
        }}
      />

      <div className="relative z-10 w-full max-w-lg rounded-xl bg-gray-800 p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Manage Tags</h3>
          <button
            type="button"
            onClick={() => openEditor({ mode: "create" })}
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-600 text-gray-200 hover:border-gray-400"
          >
            New Tag
          </button>
        </div>

        <div className="space-y-3">
          <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 p-3 space-y-2">
            {loadingProjectTags ? (
              <p className="text-sm text-gray-400">Loading tags…</p>
            ) : projectTags.length ? (
              projectTags.map((tag) => {
                const displayColor = tag.color || DEFAULT_COLOR;
                const isChecked = selectedTagIds.has(tag.id);

                return (
                  <div
                    key={tag.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-blue-500"
                      checked={isChecked}
                      onChange={() => toggleTagSelection(tag.id)}
                    />
                    <div className="flex-1">
                      <span
                        className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium text-white"
                        style={{ backgroundColor: displayColor }}
                      >
                        {tag.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditor({ mode: "edit", tag })}
                      className="rounded-md border border-gray-600 px-2 py-1 text-xs text-gray-200 hover:border-gray-400"
                    >
                      Edit
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-400">No tags yet. Create one to get started.</p>
            )}
          </div>

          {actionError && <p className="text-sm text-red-400">{actionError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeTagModal}
              className="rounded-md bg-gray-700 px-3 py-1.5 text-sm text-white hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplySelection}
              disabled={isApplying || !hasSelectionChanged}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {isApplying ? "Saving…" : "Apply"}
            </button>
          </div>
        </div>
      </div>

      {editorState && (
        <TagEditorDialog
          state={editorState}
          projectId={projectId}
          onCancel={closeEditor}
          onComplete={(tag) => handleEditorComplete(tag, editorState.mode)}
        />
      )}
    </div>
  );
}

interface TagEditorDialogProps {
  state: EditorState;
  projectId: string;
  onCancel: () => void;
  onComplete: (tag: Tag) => void;
}

function TagEditorDialog({ state, projectId, onCancel, onComplete }: TagEditorDialogProps) {
  const isEdit = state.mode === "edit";
  const referenceTag = isEdit ? state.tag : null;

  const [name, setName] = useState(referenceTag?.name ?? "");
  const [color, setColor] = useState<string>(referenceTag?.color ?? DEFAULT_COLOR);
  const [formError, setFormError] = useState<string | null>(null);

  const palette = useMemo(() => {
    const basePalette = [...COLOR_CHOICES];
    if (referenceTag?.color && !basePalette.includes(referenceTag.color)) {
      return [referenceTag.color, ...basePalette];
    }
    return basePalette;
  }, [referenceTag?.color]);

  const [addTag, { loading: creating }] = useMutation(ADD_TAG);
  const [updateTag, { loading: updating }] = useMutation(UPDATE_TAG);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === "function") {
        e.stopImmediatePropagation();
      }
      onCancel();
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [onCancel]);

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm space-y-4 rounded-xl bg-gray-800 p-6 shadow-xl"
      >
        <h4 className="text-lg font-semibold text-white">
          {isEdit ? "Edit Tag" : "Create Tag"}
        </h4>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300" htmlFor="tag-name-input">
            Name
          </label>
          <input
            id="tag-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium text-gray-300">Color</span>
          <div className="grid grid-cols-6 gap-2">
            {palette.map((option) => {
              const isSelected = option === color;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setColor(option)}
                  className={`h-9 w-9 rounded-md border-2 transition focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 ${
                    isSelected ? "border-white" : "border-transparent"
                  }`}
                  style={{ backgroundColor: option }}
                  aria-pressed={isSelected}
                />
              );
            })}
          </div>
        </div>

        {formError && <p className="text-sm text-red-400">{formError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md bg-gray-700 px-3 py-1.5 text-sm text-white hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating || updating}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {creating || updating ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
