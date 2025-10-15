import { useCallback, useEffect, useMemo, useState } from "react";

type MutationVariables = { task_id: string; tag_id: string };

type MutationExecutor = (args: { variables: MutationVariables }) => Promise<unknown>;

interface UseTagSelectionOptions {
  taskId: string | null;
  assignedTagIds: Set<string>;
  assignTag: MutationExecutor;
  removeTag: MutationExecutor;
  onAfterMutations?: () => Promise<void>;
}

interface UseTagSelectionResult {
  selectedTagIds: Set<string>;
  toggleTagSelection: (tagId: string) => void;
  selectTag: (tagId: string) => void;
  hasSelectionChanged: boolean;
  applySelection: () => Promise<boolean>;
  isApplying: boolean;
  actionError: string | null;
}

export function useTagSelection({
  taskId,
  assignedTagIds,
  assignTag,
  removeTag,
  onAfterMutations,
}: UseTagSelectionOptions): UseTagSelectionResult {
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set(assignedTagIds));
  const [isApplying, setIsApplying] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedTagIds((prev) => {
      if (setsAreEqual(prev, assignedTagIds)) {
        return prev;
      }
      return new Set(assignedTagIds);
    });
  }, [assignedTagIds]);

  const toggleTagSelection = useCallback((tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
    setActionError(null);
  }, []);

  const selectTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) => {
      if (prev.has(tagId)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(tagId);
      return next;
    });
    setActionError(null);
  }, []);

  const hasSelectionChanged = useMemo(() => {
    if (assignedTagIds.size !== selectedTagIds.size) {
      return true;
    }
    for (const id of selectedTagIds) {
      if (!assignedTagIds.has(id)) {
        return true;
      }
    }
    return false;
  }, [assignedTagIds, selectedTagIds]);

  const applySelection = useCallback(async () => {
    if (!taskId) {
      return false;
    }

    const initialIds = assignedTagIds;
    const selectedIds = Array.from(selectedTagIds);

    const toAssign = selectedIds.filter((id) => !initialIds.has(id));
    const toRemove = Array.from(initialIds).filter((id) => !selectedTagIds.has(id));

    if (!toAssign.length && !toRemove.length) {
      return true;
    }

    setIsApplying(true);
    setActionError(null);

    try {
      await Promise.all([
        ...toAssign.map((tagId) => assignTag({ variables: { task_id: taskId, tag_id: tagId } })),
        ...toRemove.map((tagId) => removeTag({ variables: { task_id: taskId, tag_id: tagId } })),
      ]);

      if (onAfterMutations) {
        await onAfterMutations();
      }

      return true;
    } catch (error) {
      setActionError((error as Error).message ?? "Failed to update tags");
      return false;
    } finally {
      setIsApplying(false);
    }
  }, [assignTag, removeTag, onAfterMutations, selectedTagIds, assignedTagIds, taskId]);

  return {
    selectedTagIds,
    toggleTagSelection,
    selectTag,
    hasSelectionChanged,
    applySelection,
    isApplying,
    actionError,
  };
}

function setsAreEqual(left: Set<string>, right: Set<string>) {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}
