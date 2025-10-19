import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, CalendarDays, Loader2, Plus, Save, X } from "lucide-react";
import type { AuthUser, TaskStatus, WorkItem, WorkItemType } from "@shared/types";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Input,
  Textarea,
} from "../components/ui";
import { TaskStatusDropdown } from "../components/tasks/TaskStatusDropdown";
import { AssigneeDropdown } from "../components/TaskModal/AssigneeDropdown";
import type { CommentWithUser, ProjectMember } from "../components/TaskModal/types";
import { useAssigneePicker } from "../components/TaskModal/useAssigneePicker";
import { TaskTagsAddButton, TagEditDialog } from "../components/TaskModal/TaskTagsList";
import { TaskCommentsPanel } from "../components/TaskModal/TaskCommentsPanel";
import {
  ADD_TAG,
  ADD_WORK_ITEM_COMMENT,
  ASSIGN_TAG_TO_WORK_ITEM,
  DELETE_WORK_ITEM_COMMENT,
  GET_PROJECT_MEMBERS,
  GET_PROJECT_TAGS,
  GET_WORK_ITEM,
  REMOVE_TAG_FROM_WORK_ITEM,
  SEARCH_USERS,
  SET_WORK_ITEM_ASSIGNEE,
  UPDATE_TAG,
  UPDATE_WORK_ITEM,
  UPDATE_WORK_ITEM_COMMENT,
} from "../graphql";
import { getWorkItemTypeLabel, WORK_ITEM_TYPE_LABELS } from "../constants/workItems";
import { getWorkItemIconMeta } from "../constants/workItemVisuals";

type WorkItemQueryResult = {
  workItem: WorkItem | null;
};

const STATUS_META: Record<
  string,
  {
    label: string;
    badgeClass: string;
  }
> = {
  new: {
    label: "New",
    badgeClass: "bg-[#3a3a3a] text-white dark:bg-white/20 dark:text-white",
  },
  active: {
    label: "Active",
    badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  closed: {
    label: "Closed",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
};

function getPriorityLabel(priority?: string | null): string {
  if (!priority) return "None";
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatDate(value?: string | null): string {
  if (!value) return "Not set";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "Not set";
  }
}

function formatRelativeTimeFromNow(timestamp?: string | null): string {
  if (!timestamp) return "just now";
  const parsed = new Date(timestamp);
  const now = Date.now();
  if (Number.isNaN(parsed.getTime())) {
    return "just now";
  }
  const diffSeconds = Math.max(0, Math.floor((now - parsed.getTime()) / 1000));
  if (diffSeconds < 5) return "just now";
  if (diffSeconds < 60) {
    const seconds = diffSeconds;
    return `${seconds} second${seconds === 1 ? "" : "s"} ago`;
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) {
    return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
  }
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  }
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
}

function WorkItemDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-12 w-1/2" />
      <Skeleton className="h-5 w-40" />
      <Card>
        <CardHeader className="space-y-4">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-1/4" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/5" />
        </CardContent>
      </Card>
    </div>
  );
}

function resolveWorkItemLink(projectId: string, itemId: string, type: WorkItemType): string {
  if (type === "TASK" || type === "BUG") {
    return `/projects/${projectId}/tasks/${itemId}`;
  }
  return `/projects/${projectId}/work-items/${itemId}`;
}

export function WorkItemDetailsPage({ user: _user }: { user: AuthUser | null }) {
  const { id, workItemId } = useParams<{ id: string; workItemId: string }>();
  const projectId = id ?? null;
  const navigate = useNavigate();

  const { data, loading, error, refetch } = useQuery<WorkItemQueryResult>(GET_WORK_ITEM, {
    variables: workItemId ? { id: workItemId } : undefined,
    skip: !workItemId,
    fetchPolicy: "network-only",
  });

  const [updateWorkItemMutation, { loading: isSaving }] = useMutation(UPDATE_WORK_ITEM);
  const [setWorkItemAssigneeMutation] = useMutation(SET_WORK_ITEM_ASSIGNEE);
  const [assignTagToWorkItemMutation] = useMutation(ASSIGN_TAG_TO_WORK_ITEM);
  const [removeTagFromWorkItemMutation] = useMutation(REMOVE_TAG_FROM_WORK_ITEM);
  const [createTagMutation] = useMutation(ADD_TAG);
  const [updateTagMutation] = useMutation(UPDATE_TAG);
  const [addCommentMutation] = useMutation(ADD_WORK_ITEM_COMMENT);
  const [updateCommentMutation] = useMutation(UPDATE_WORK_ITEM_COMMENT);
  const [deleteCommentMutation] = useMutation(DELETE_WORK_ITEM_COMMENT);

  const workItem = data?.workItem ?? null;
  const user = _user;

  const { data: projectMembersData, loading: isMembersLoading } = useQuery(GET_PROJECT_MEMBERS, {
    variables: projectId ? { project_id: projectId } : undefined,
    skip: !projectId,
  });

  const projectMembers = useMemo(
    () => (projectMembersData?.projectMembers ?? []) as ProjectMember[],
    [projectMembersData?.projectMembers]
  );

  const {
    data: projectTagsData,
    loading: isProjectTagsLoading,
    refetch: refetchProjectTags,
  } = useQuery(GET_PROJECT_TAGS, {
    variables: projectId ? { project_id: projectId } : undefined,
    skip: !projectId,
  });

  const availableTags = useMemo<Array<{ id: string; name: string; color: string | null }>>(
    () => {
      const tags = (projectTagsData?.tags ?? []) as Array<{ id: string; name: string | null; color: string | null }>;
      return tags.map((tag) => ({
        id: tag.id,
        name: tag.name ?? "",
        color: tag.color ?? null,
      }));
    },
    [projectTagsData?.tags]
  );

  const [searchUsers, { loading: isSearchingMembers }] = useLazyQuery(SEARCH_USERS, {
    fetchPolicy: "no-cache",
  });

  const [stagedTitle, setStagedTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [stagedStatus, setStagedStatus] = useState<TaskStatus>("new");
  const [stagedAssignee, setStagedAssignee] = useState<WorkItem["assignee"] | null>(null);
  const [assigneeError, setAssigneeError] = useState<string | null>(null);
  const [isAssigneeUpdating, setIsAssigneeUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [stagedDescription, setStagedDescription] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [stagedTags, setStagedTags] = useState<Array<{ id: string; name: string; color: string | null }>>([]);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [isTagsUpdating, setIsTagsUpdating] = useState(false);
  const [updatingTagId, setUpdatingTagId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const titleSizerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!workItem) {
      setStagedTitle("");
      setIsEditingTitle(false);
      setTitleError(null);
      setStagedStatus("new");
      setStagedAssignee(null);
      setAssigneeError(null);
      setStagedDescription("");
      setIsEditingDescription(false);
      setStagedTags([]);
      setTagsError(null);
      setIsTagsUpdating(false);
      setUpdatingTagId(null);
      setCommentText("");
      setEditingCommentId(null);
      setEditingCommentText("");
      return;
    }
    setStagedTitle(workItem.title ?? "");
    setStagedStatus((workItem.status ?? "new") as TaskStatus);
    setStagedDescription(workItem.description ?? "");
    setStagedAssignee(workItem.assignee ?? null);
    setAssigneeError(null);
    setStagedTags(
      (workItem.tags ?? []).map((tag) => ({
        id: tag.id,
        name: tag.name ?? "",
        color: tag.color ?? null,
      }))
    );
    setTagsError(null);
    setIsTagsUpdating(false);
    setUpdatingTagId(null);
    setCommentText("");
    setEditingCommentId(null);
    setEditingCommentText("");
    setIsEditingTitle(false);
    setTitleError(null);
    setIsEditingDescription(false);
  }, [workItem?.assignee, workItem?.description, workItem?.id, workItem?.status, workItem?.tags, workItem?.title]);

  const updateTitleWidth = useCallback(() => {
    if (!titleSizerRef.current || !titleInputRef.current) return;
    const measuredWidth = titleSizerRef.current.offsetWidth;
    const basePadding = 24;
    const width = Math.max(measuredWidth + basePadding, 160);
    titleInputRef.current.style.width = `${width}px`;
  }, []);

  useEffect(() => {
    updateTitleWidth();
  }, [updateTitleWidth, stagedTitle, isEditingTitle]);

  const handleStatusChange = useCallback((nextStatus: TaskStatus) => {
    setStagedStatus(nextStatus);
    setStatusError(null);
  }, []);

  const handleTitleChange = useCallback((value: string) => {
    setStagedTitle(value);
    if (value.trim().length > 0) {
      setTitleError(null);
    }
  }, []);

  const handleDescriptionChange = useCallback((value: string) => {
    setStagedDescription(value);
  }, []);

  const handleCancelDescription = useCallback(() => {
    if (!workItem) return;
    setIsEditingDescription(false);
    setStagedDescription(workItem.description ?? "");
  }, [workItem]);

  const stageAssigneeById = useCallback(
    (memberId: string | null) => {
      setAssigneeError(null);
      if (!memberId) {
        setStagedAssignee(null);
        return;
      }
      setStagedAssignee((previous) => {
        if (previous?.id === memberId) {
          return previous;
        }
        const member = projectMembers.find((candidate) => candidate.id === memberId);
        if (!member) {
          return previous;
        }
        return {
          id: member.id,
          first_name: member.first_name,
          last_name: member.last_name,
          username: member.username,
          avatar_color: member.avatar_color ?? null,
        };
      });
    },
    [projectMembers]
  );

  const handleAssignMember = useCallback(
    (memberId: string) => {
      stageAssigneeById(memberId);
    },
    [stageAssigneeById]
  );

  const handleClearAssignee = useCallback(() => {
    stageAssigneeById(null);
  }, [stageAssigneeById]);

  const handleRemoveTag = useCallback((tagId: string) => {
    setTagsError(null);
    setStagedTags((previous) => previous.filter((tag) => tag.id !== tagId));
  }, []);

  const handleAddExistingTag = useCallback(
    (tagId: string) => {
      setTagsError(null);
      setStagedTags((previous) => {
        if (previous.some((tag) => tag.id === tagId)) {
          return previous;
        }
        const matching = availableTags.find((candidate) => candidate.id === tagId);
        if (!matching) {
          return previous;
        }
        return [
          ...previous,
          {
            id: matching.id,
            name: matching.name,
            color: matching.color ?? null,
          },
        ];
      });
    },
    [availableTags]
  );

  const handleCreateTag = useCallback(
    async ({ name, color }: { name: string; color: string }) => {
      if (!projectId) {
        const message = "Project context is missing";
        setTagsError(message);
        throw new Error(message);
      }

      const trimmedName = name.trim();
      const trimmedColor = color.trim();

      if (!trimmedName) {
        const message = "Tag name is required";
        setTagsError(message);
        throw new Error(message);
      }

      setTagsError(null);

      try {
        const { data: created } = await createTagMutation({
          variables: {
            project_id: projectId,
            name: trimmedName,
            color: trimmedColor || null,
          },
        });

        await refetchProjectTags().catch(() => undefined);

        const createdTag = created?.addTag;
        if (createdTag) {
          setStagedTags((previous) => {
            if (previous.some((tag) => tag.id === createdTag.id)) {
              return previous;
            }
            return [
              ...previous,
              {
                id: createdTag.id,
                name: createdTag.name,
                color: createdTag.color ?? null,
              },
            ];
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create tag";
        setTagsError(message);
        throw new Error(message);
      }
    },
    [createTagMutation, projectId, refetchProjectTags]
  );

  const handleUpdateTag = useCallback(
    async ({ id, name, color }: { id: string; name: string; color: string | null }) => {
      const resolvedName = name.trim();
      const sanitizedColor = color?.trim() ?? "";
      if (!projectId) {
        const message = "Project context is missing";
        setTagsError(message);
        throw new Error(message);
      }

      setTagsError(null);
      setUpdatingTagId(id);

      try {
        const { data: updated } = await updateTagMutation({
          variables: {
            id,
            project_id: projectId,
            name: resolvedName,
            color: sanitizedColor || null,
          },
        });

        await refetchProjectTags().catch(() => undefined);

        const updatedTag = updated?.updateTag;
        const nextName = updatedTag?.name?.trim() || resolvedName;
        const nextColor = updatedTag?.color ?? (sanitizedColor || null);

        setStagedTags((previous) =>
          previous.map((existing) =>
            existing.id === id
              ? {
                  id,
                  name: nextName,
                  color: nextColor,
                }
              : existing
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update tag";
        setTagsError(message);
        throw new Error(message);
      } finally {
        setUpdatingTagId(null);
      }
    },
    [projectId, refetchProjectTags, updateTagMutation]
  );

  const handleSearchMembers = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        return projectMembers;
      }

      try {
        const { data: searchData } = await searchUsers({ variables: { query: trimmed } });
        const results = (searchData?.searchUsers ?? []) as ProjectMember[];
        const seen = new Set<string>();
        return results.filter((candidate) => {
          if (seen.has(candidate.id)) {
            return false;
          }
          seen.add(candidate.id);
          return true;
        });
      } catch (err) {
        console.error("Failed to search teammates", err);
        return [];
      }
    },
    [projectMembers, searchUsers]
  );

  const {
    isOpen: isAssigneeMenuOpen,
    setIsOpen: setIsAssigneeMenuOpen,
    query: assigneeQuery,
    trimmedQuery,
    handleQueryChange,
    inputRef: assigneeSearchRef,
    visibleMembers,
    isLoadingVisibleMembers,
    isShowingSearchResults,
    handleInputKeyDown,
    handleSelectMember,
  } = useAssigneePicker({
    assignee: stagedAssignee ?? null,
    members: projectMembers,
    onSearchMembers: handleSearchMembers,
    isMembersLoading,
    isSearchingMembers,
    onAssignMember: handleAssignMember,
    isAssigningAssignee: isAssigneeUpdating || isSaving,
  });

  const originalTagIdsSorted = useMemo(
    () => (workItem?.tags ?? []).map((tag) => tag.id).sort(),
    [workItem?.tags]
  );

  const stagedTagIdsSorted = useMemo(
    () => stagedTags.map((tag) => tag.id).sort(),
    [stagedTags]
  );

  const trimmedTitle = stagedTitle.trim();
  const hasTitleChanged = workItem ? trimmedTitle !== (workItem.title ?? "") : trimmedTitle.length > 0;
  const hasDescriptionChanged = workItem ? stagedDescription !== (workItem.description ?? "") : stagedDescription.length > 0;
  const hasStatusChanged = workItem ? stagedStatus !== ((workItem.status ?? "new") as TaskStatus) : false;
  const currentAssigneeId = workItem?.assignee?.id ?? null;
  const stagedAssigneeId = stagedAssignee?.id ?? null;
  const hasAssigneeChanged = workItem ? currentAssigneeId !== stagedAssigneeId : stagedAssigneeId !== null;
  const hasTagsChanged = workItem
    ? stagedTagIdsSorted.length !== originalTagIdsSorted.length ||
      stagedTagIdsSorted.some((id, index) => id !== originalTagIdsSorted[index])
    : stagedTagIdsSorted.length > 0;
  const isDirty = hasTitleChanged || hasDescriptionChanged || hasStatusChanged || hasAssigneeChanged || hasTagsChanged;
  const isSaveDisabled = !workItem || isSaving || !isDirty || trimmedTitle.length === 0;


  const handleSave = useCallback(async () => {
    if (!workItem) return;
    const titleValue = trimmedTitle;
    if (titleValue.length === 0) {
      setTitleError("Title is required.");
      setIsEditingTitle(true);
      return;
    }

    const payload: Record<string, unknown> = {};
    if (titleValue !== workItem.title) {
      payload.title = titleValue;
    }

    const normalizedExistingDescription =
      workItem.description && workItem.description.trim().length > 0 ? workItem.description : null;
    const normalizedNextDescription =
      stagedDescription.trim().length > 0 ? stagedDescription : null;
    if (normalizedNextDescription !== normalizedExistingDescription) {
      payload.description = normalizedNextDescription;
    }

    if (stagedStatus !== ((workItem.status ?? "new") as TaskStatus)) {
      payload.status = stagedStatus;
    }

    const tagsToAdd = stagedTagIdsSorted.filter((id) => !originalTagIdsSorted.includes(id));
    const tagsToRemove = originalTagIdsSorted.filter((id) => !stagedTagIdsSorted.includes(id));

    const hasWorkItemFieldChanges = Object.keys(payload).length > 0;
    const assigneeChanged = hasAssigneeChanged;
    const tagsChanged = hasTagsChanged;

    if (!hasWorkItemFieldChanges && !assigneeChanged && !tagsChanged) {
      setIsEditingTitle(false);
      setIsEditingDescription(false);
      return;
    }

    setTitleError(null);
    setAssigneeError(null);
    setTagsError(null);
    setIsAssigneeUpdating(assigneeChanged);
    setIsTagsUpdating(tagsChanged);

    let didUpdateTitleOrStatus = false;
    let didUpdateAssignee = false;
    let didUpdateTags = false;
    let tagOperationError: string | null = null;

    try {
      if (hasWorkItemFieldChanges) {
        try {
          const result = await updateWorkItemMutation({
            variables: {
              id: workItem.id,
              input: payload,
            },
          });
          const updated = result.data?.updateWorkItem;
          if (updated) {
            setStagedTitle(updated.title ?? "");
            setStagedStatus((updated.status ?? "new") as TaskStatus);
            setStagedDescription(updated.description ?? "");
            didUpdateTitleOrStatus = true;
          }
        } catch (err) {
          if (hasStatusChanged) {
            setStatusError(err instanceof Error ? err.message : "Unable to update state.");
          }
        }
      }

      if (assigneeChanged) {
        try {
          await setWorkItemAssigneeMutation({
            variables: {
              work_item_id: workItem.id,
              assignee_id: stagedAssigneeId,
            },
          });
          didUpdateAssignee = true;
        } catch (err) {
          setAssigneeError(err instanceof Error ? err.message : "Unable to update the assignee.");
        }
      }

      if (tagsChanged) {
        for (const tagId of tagsToAdd) {
          try {
            await assignTagToWorkItemMutation({
              variables: { work_item_id: workItem.id, tag_id: tagId },
            });
            didUpdateTags = true;
          } catch (err) {
            tagOperationError = err instanceof Error ? err.message : "Unable to assign tag.";
          }
        }

        for (const tagId of tagsToRemove) {
          try {
            await removeTagFromWorkItemMutation({
              variables: { work_item_id: workItem.id, tag_id: tagId },
            });
            didUpdateTags = true;
          } catch (err) {
            tagOperationError = err instanceof Error ? err.message : "Unable to remove tag.";
          }
        }

        if (tagOperationError) {
          setTagsError(tagOperationError);
        }
      }

      if (didUpdateTitleOrStatus || didUpdateAssignee || didUpdateTags) {
        await refetch().catch(() => undefined);
        setIsEditingTitle(false);
        setIsEditingDescription(false);
      }
    } finally {
      setIsAssigneeUpdating(false);
      setIsTagsUpdating(false);
    }
  }, [
    assignTagToWorkItemMutation,
    hasAssigneeChanged,
    hasTagsChanged,
    originalTagIdsSorted,
    refetch,
    removeTagFromWorkItemMutation,
    setWorkItemAssigneeMutation,
    stagedAssigneeId,
    stagedDescription,
    stagedStatus,
    stagedTagIdsSorted,
    trimmedTitle,
    updateWorkItemMutation,
    workItem,
  ]);

  const typeLabel = useMemo(
    () => getWorkItemTypeLabel(workItem?.type ?? null),
    [workItem?.type]
  );
  const { icon: TypeIcon, colorClass: typeColorClass } = useMemo(
    () => getWorkItemIconMeta(workItem?.type ?? undefined),
    [workItem?.type]
  );

  const statusMeta = useMemo(() => STATUS_META[stagedStatus] ?? STATUS_META.new, [stagedStatus]);

  const updatedLabel = useMemo(() => {
    const source = workItem?.updated_at ?? workItem?.created_at ?? null;
    const relative = formatRelativeTimeFromNow(source);
    return `Updated ${relative}`;
  }, [workItem?.updated_at, workItem?.created_at]);

  const comments = useMemo<CommentWithUser[]>(() => {
    return (workItem?.comments ?? []).map((comment) => ({
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      updated_at: comment.updated_at ?? comment.created_at,
      work_item_id: comment.work_item_id,
      user: comment.user ?? null,
    }));
  }, [workItem?.comments]);

  const handleSubmitComment = useCallback(async () => {
    if (!workItem) return;
    const trimmed = commentText.trim();
    if (!trimmed) return;
    try {
      await addCommentMutation({
        variables: {
          input: {
            work_item_id: workItem.id,
            content: trimmed,
          },
        },
      });
      await refetch();
      setCommentText("");
    } catch (err) {
      console.error("Failed to add comment", err);
    }
  }, [addCommentMutation, commentText, refetch, workItem]);

  const handleStartEditComment = useCallback((commentId: string, content: string | null) => {
    setEditingCommentId(commentId);
    setEditingCommentText(content ?? "");
  }, []);

  const handleCancelCommentEdit = useCallback(() => {
    setEditingCommentId(null);
    setEditingCommentText("");
  }, []);

  const handleSubmitCommentEdit = useCallback(async () => {
    if (!editingCommentId) return;
    const trimmed = editingCommentText.trim();
    if (!trimmed) return;
    try {
      await updateCommentMutation({
        variables: {
          input: {
            id: editingCommentId,
            content: trimmed,
          },
        },
      });
      await refetch();
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (err) {
      console.error("Failed to update comment", err);
    }
  }, [editingCommentId, editingCommentText, refetch, updateCommentMutation]);

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      try {
        await deleteCommentMutation({ variables: { id: commentId } });
        await refetch();
        if (editingCommentId === commentId) {
          setEditingCommentId(null);
          setEditingCommentText("");
        }
      } catch (err) {
        console.error("Failed to delete comment", err);
      }
    },
    [deleteCommentMutation, editingCommentId, refetch]
  );

  const hasTags = stagedTags.length > 0;
  const addTagTrigger = hasTags ? (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      disabled={isSaving || isTagsUpdating}
      className="h-7 w-7 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
      aria-label="Add tag"
    >
      <Plus className="h-3.5 w-3.5" />
    </Button>
  ) : (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={isSaving || isTagsUpdating}
      className="gap-1 border-dashed border-border/60 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary"
    >
      <Plus className="h-3.5 w-3.5" />
      Add tag
    </Button>
  );

  if (!projectId) {
    return <div className="p-6 text-destructive">Project identifier is missing.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="inline-flex items-center gap-2 pl-0 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => navigate(`/projects/${projectId}/work-items`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to work items
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load work item</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? <WorkItemDetailsSkeleton /> : null}

      {!loading && !workItem ? (
        <Alert>
          <AlertTitle>Work item not found</AlertTitle>
          <AlertDescription>
            We couldn&apos;t locate this work item. It may have been deleted or you might not have access.
          </AlertDescription>
        </Alert>
      ) : null}

      {!loading && workItem ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-border/70 bg-[hsl(var(--card))] p-6 shadow-sm">
                <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <TypeIcon className={`h-3.5 w-3.5 ${typeColorClass}`} />
                    <span>{typeLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {workItem.task?.id ? (
                      <Button
                        variant="outline"
                        className="inline-flex items-center gap-2"
                        onClick={() => navigate(`/projects/${projectId}/tasks/${workItem.task?.id}`)}
                      >
                        Open task view
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleSave()}
                      disabled={isSaveDisabled}
                      className="inline-flex items-center gap-2 rounded-full px-4"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {isSaving ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                    <div className="md:-mt-2">
                      <div className="relative">
                        <span
                          className="pointer-events-none invisible absolute whitespace-pre text-3xl font-semibold leading-tight"
                          ref={(element) => {
                            titleSizerRef.current = element;
                          }}
                        >
                          {stagedTitle || "Add a title..."}
                        </span>
                        {isEditingTitle ? (
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-y-0 left-0 flex h-full w-[1.25rem] items-center justify-center rounded-l-md border border-border bg-[hsl(var(--card))]"
                          />
                        ) : null}
                        <Input
                          ref={titleInputRef}
                          value={stagedTitle}
                          readOnly={!isEditingTitle}
                          onClick={() => {
                            if (!isEditingTitle) {
                              setIsEditingTitle(true);
                              setTitleError(null);
                            }
                          }}
                          onChange={(event) => handleTitleChange(event.target.value)}
                          onBlur={() => setIsEditingTitle(false)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault();
                              void handleSave();
                            } else if (event.key === "Escape") {
                              event.preventDefault();
                              setIsEditingTitle(false);
                              setStagedTitle(workItem.title ?? "");
                              setTitleError(null);
                            }
                          }}
                          disabled={isEditingTitle && isSaving}
                          aria-invalid={titleError ? "true" : "false"}
                          className={
                            isEditingTitle
                              ? "relative z-10 h-11 min-w-[7.5rem] rounded-md border border-border bg-transparent pl-2 pr-1 text-left text-3xl font-semibold leading-tight text-foreground shadow-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
                              : "relative z-10 h-11 min-w-[7.5rem] rounded-md border border-transparent bg-transparent pl-2 pr-1 text-left text-3xl font-semibold leading-tight text-foreground"
                          }
                          style={{ width: "auto" }}
                        />
                      </div>
                      {titleError ? <p className="mt-2 text-xs text-destructive">{titleError}</p> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      {hasTags
                        ? stagedTags.map((tag) => {
                            const hasColor = Boolean(tag.color);
                            const isUpdatingCurrentTag = updatingTagId === tag.id;
                            const isToolbarForcedVisible = isTagsUpdating || isUpdatingCurrentTag;
                            return (
                              <div key={tag.id} className="group relative flex items-center pr-2">
                                <div
                                  className={`flex min-h-[30px] items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow-sm ${
                                    hasColor
                                      ? "border border-transparent text-primary-foreground"
                                      : "border border-border/60 bg-muted/20 text-foreground"
                                  }`}
                                  style={hasColor ? { backgroundColor: tag.color ?? undefined } : undefined}
                                >
                                  <span className="truncate">{tag.name}</span>
                                </div>
                                <div
                                  className={`pointer-events-none absolute right-0 top-0 flex -translate-y-1/2 -translate-x-2 items-center gap-[1px] rounded-sm border border-border/60 bg-[hsl(var(--card))] px-[2px] py-0 text-[10px] shadow-sm opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 z-10${
                                    isToolbarForcedVisible ? " pointer-events-auto opacity-100" : ""
                                  }`}
                                >
                                  <TagEditDialog
                                    tag={tag}
                                    isUpdating={isUpdatingCurrentTag || isTagsUpdating}
                                    onSubmit={handleUpdateTag}
                                    buttonClassName="pointer-events-auto"
                                  />
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleRemoveTag(tag.id)}
                                    disabled={isSaving || isTagsUpdating || isUpdatingCurrentTag}
                                    className="pointer-events-auto h-[14px] w-[14px] rounded-sm border border-transparent text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                                    aria-label={`Remove ${tag.name}`}
                                  >
                                    <X size={9} strokeWidth={2} />
                                    <span className="sr-only">Remove tag</span>
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        : null}
                      <TaskTagsAddButton
                        tags={stagedTags}
                        availableTags={availableTags}
                        loadingAvailableTags={isProjectTagsLoading}
                        onAddTag={handleAddExistingTag}
                        onCreateTag={handleCreateTag}
                        trigger={addTagTrigger}
                      />
                    </div>
                  </div>
                  {tagsError ? <p className="text-xs text-destructive">{tagsError}</p> : null}
                </div>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex flex-wrap items-start gap-6">
                    <div className="flex min-w-[14rem] flex-col gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Assignee
                      </span>
                      <AssigneeDropdown
                        assignee={stagedAssignee ?? null}
                        isOpen={isAssigneeMenuOpen}
                        onOpenChange={setIsAssigneeMenuOpen}
                        query={assigneeQuery}
                        onQueryChange={handleQueryChange}
                        inputRef={assigneeSearchRef}
                        visibleMembers={visibleMembers}
                        isLoadingMembers={isLoadingVisibleMembers}
                        isShowingSearchResults={isShowingSearchResults}
                        trimmedQuery={trimmedQuery}
                        onSelectMember={handleSelectMember}
                        onClearAssignee={handleClearAssignee}
                        isAssigningAssignee={isAssigneeUpdating || isSaving}
                        onInputKeyDown={handleInputKeyDown}
                      />
                      {assigneeError ? <span className="text-xs text-destructive">{assigneeError}</span> : null}
                    </div>
                    <div className="flex min-w-[11rem] flex-col gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        State
                      </span>
                      <TaskStatusDropdown
                        value={stagedStatus}
                        onChange={handleStatusChange}
                        isUpdating={isSaving}
                        disabled={isSaving}
                        triggerClassName="rounded-full bg-muted/40 px-4 py-2 text-sm"
                      />
                      {statusError ? <span className="text-xs text-destructive">{statusError}</span> : null}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground lg:text-right">{updatedLabel}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <Card className="border border-border/60">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base font-semibold text-foreground">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditingDescription ? (
                    <div className="space-y-3">
                      <Textarea
                        value={stagedDescription}
                        onChange={(event) => handleDescriptionChange(event.target.value)}
                        placeholder={`Add background context, goals, or implementation notes for this ${typeLabel.toLowerCase()}.`}
                        className="min-h-[160px] resize-y"
                        disabled={isSaving}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => void handleSave()}
                          disabled={isSaving || !hasDescriptionChanged}
                          className="inline-flex items-center gap-2"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            "Save"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleCancelDescription}
                          disabled={isSaving}
                          className="border border-border/70 text-muted-foreground hover:border-border hover:bg-neutral-200 hover:text-foreground dark:hover:bg-neutral-800"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      className="rounded-lg border border-transparent px-4 py-3 transition-colors hover:border-primary/40"
                        onClick={() => {
                          setIsEditingDescription(true);
                        }}
                      onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setIsEditingDescription(true);
                          }
                      }}
                    >
                      {stagedDescription.trim() ? (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                          {stagedDescription}
                        </div>
                      ) : (
                        <p className="text-sm italic text-muted-foreground">
                          Add background context, goals, or implementation notes for this {typeLabel.toLowerCase()}.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">Acceptance criteria</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm italic text-muted-foreground">
                    Capture the checklist that must be true before this {typeLabel.toLowerCase()} can be considered complete.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">Discussion</CardTitle>
                </CardHeader>
                <CardContent>
                  <TaskCommentsPanel
                    comments={comments}
                    loading={loading}
                    commentText={commentText}
                    onCommentTextChange={setCommentText}
                    onSubmitComment={handleSubmitComment}
                    editingCommentId={editingCommentId}
                    editingCommentText={editingCommentText}
                    onEditCommentTextChange={setEditingCommentText}
                    onStartEditComment={handleStartEditComment}
                    onCancelEditComment={handleCancelCommentEdit}
                    onSubmitEditComment={handleSubmitCommentEdit}
                    onDeleteComment={handleDeleteComment}
                    currentUserId={user?.id ?? null}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Status</span>
                    <span className="text-foreground">{statusMeta.label}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Priority</span>
                    <span className="text-foreground">{getPriorityLabel(workItem.priority ?? null)}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Estimate</span>
                    <span className="text-foreground">
                      {typeof workItem.estimate === "number" ? workItem.estimate : "Not set"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Due date</span>
                    <span className="flex items-center gap-2 text-foreground">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      {formatDate(workItem.due_date)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">Related work</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {workItem.parent ? (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent</span>
                      <Link
                        to={resolveWorkItemLink(projectId, workItem.parent.id, workItem.parent.type as WorkItemType)}
                        className="flex items-center justify-between gap-3 rounded-md border border-transparent px-3 py-2 text-sm transition-colors hover:border-border hover:bg-muted/50"
                      >
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {WORK_ITEM_TYPE_LABELS[workItem.parent.type as WorkItemType] ?? "Work Item"}
                          </p>
                          <p className="font-medium text-foreground">{workItem.parent.title}</p>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </div>
                  ) : null}
                  {workItem.children && workItem.children.length > 0 ? (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Children
                      </span>
                      <div className="space-y-2">
                        {workItem.children.map((child) => {
                          const childType = child.type as WorkItemType;
                          const childTypeLabel = WORK_ITEM_TYPE_LABELS[childType] ?? "Work Item";
                          return (
                            <Link
                              key={child.id}
                              to={resolveWorkItemLink(projectId, child.id, childType)}
                              className="flex items-center justify-between gap-3 rounded-md border border-transparent px-3 py-2 text-sm transition-colors hover:border-border hover:bg-muted/50"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {childTypeLabel}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    Status · {(child.status ?? "New").toString()}
                                  </span>
                                </div>
                                <p className="font-medium text-foreground">{child.title}</p>
                              </div>
                              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  {!workItem.parent && (!workItem.children || workItem.children.length === 0) ? (
                    <p className="text-sm italic text-muted-foreground">
                      Link related work to map the hierarchy for this {typeLabel.toLowerCase()}.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
