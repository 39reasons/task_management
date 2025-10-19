import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Save, X } from "lucide-react";
import type { AuthUser, Task, TaskStatus, WorkItemType } from "@shared/types";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Avatar,
  AvatarFallback,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Input,
  Textarea,
} from "../components/ui";
import { AssigneeDropdown } from "../components/TaskModal/AssigneeDropdown";
import type { CommentWithUser, ProjectMember } from "../components/TaskModal/types";
import { useAssigneePicker } from "../components/TaskModal/useAssigneePicker";
import { TaskStatusDropdown } from "../components/tasks/TaskStatusDropdown";
import { TaskCommentsPanel } from "../components/TaskModal/TaskCommentsPanel";
import { TaskTagsAddButton, TagEditDialog } from "../components/TaskModal/TaskTagsList";
import {
  ADD_COMMENT,
  ADD_TAG,
  ASSIGN_TAG_TO_TASK,
  ASSIGN_TAG_TO_WORK_ITEM,
  DELETE_COMMENT,
  GET_COMMENTS,
  GET_PROJECT_TAGS,
  GET_PROJECT_MEMBERS,
  GET_TASK,
  REMOVE_TAG_FROM_TASK,
  SEARCH_USERS,
  SET_TASK_ASSIGNEE,
  UPDATE_COMMENT,
  UPDATE_TASK,
  UPDATE_TAG,
} from "../graphql";
import { DEFAULT_AVATAR_COLOR } from "../constants/colors";
import { getWorkItemTypeFromSlug, getWorkItemTypeLabel } from "../constants/workItems";
import { getWorkItemIconMeta } from "../constants/workItemVisuals";
import { getFullName, getInitials } from "../utils/user";
import { CREATE_WORK_ITEM } from "../graphql/workItems";
import { GET_PROJECT } from "../graphql/projects";
import { formatDate, formatRelativeTimeFromNow } from "../utils/date";
import { getPriorityLabel, resolveWorkItemLink } from "../utils/workItem";

type TaskQueryResult = {
  task: Task | null;
};

type ProjectQueryResult = {
  project: {
    id: string;
    teams: Array<{
      id: string;
      name: string;
    }>;
  } | null;
};

function TaskDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-5 w-40" />
      <Card>
        <CardHeader className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="flex gap-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-10 rounded-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function resolveUserLabel(user: AuthUser | null): string {
  if (!user) return "someone";
  const fullName = getFullName(user);
  if (fullName && fullName.trim().length > 0) {
    return fullName;
  }
  if (user.username && user.username.trim().length > 0) {
    return `@${user.username}`;
  }
  return "someone";
}

function buildUpdatedByLabel(userLabel: string, timestamp?: string | null): string {
  const relative = formatRelativeTimeFromNow(timestamp);
  return `Updated by ${userLabel} ${relative}`;
}

export function TaskDetailsPage({ user }: { user: AuthUser | null }) {
  const { id, taskId, type } = useParams<{ id: string; taskId?: string; type?: string }>();
  const projectId = id ?? null;
  const navigate = useNavigate();
  const templateType = getWorkItemTypeFromSlug(type);
  const isTemplateMode = !taskId && Boolean(templateType);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [teamError, setTeamError] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery<TaskQueryResult>(GET_TASK, {
    variables: taskId ? { id: taskId } : undefined,
    skip: !taskId,
    fetchPolicy: "network-only",
  });

  const { data: projectData, loading: isProjectLoading } = useQuery<ProjectQueryResult>(GET_PROJECT, {
    variables: projectId ? { id: projectId } : undefined,
    skip: !projectId || !isTemplateMode,
    fetchPolicy: "cache-first",
  });

  const task = data?.task ?? null;
  const projectTeams = useMemo(() => projectData?.project?.teams ?? [], [projectData?.project?.teams]);
  const isProjectTeamsLoading = isTemplateMode && isProjectLoading;

  const stageLabel = useMemo(() => {
    if (!task) return "Not assigned to a board stage";
    return task.stage?.name ?? "Backlog or unassigned";
  }, [task]);

  const { data: projectMembersData, loading: isMembersLoading } = useQuery(GET_PROJECT_MEMBERS, {
    variables: projectId ? { project_id: projectId } : undefined,
    skip: !projectId || !user,
  });

  const projectMembers = useMemo(
    () => (projectMembersData?.projectMembers ?? []) as ProjectMember[],
    [projectMembersData]
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

  const {
    data: commentsData,
    loading: commentsLoading,
    refetch: refetchComments,
  } = useQuery(GET_COMMENTS, {
    variables: taskId ? { task_id: taskId } : undefined,
    skip: !taskId,
  });

  const comments = useMemo(
    () => ((commentsData?.task?.comments ?? []) as CommentWithUser[]),
    [commentsData?.task?.comments]
  );

  useEffect(() => {
    if (!isTemplateMode) return;
    if (projectTeams.length === 0) {
      setSelectedTeamId("");
      return;
    }
    if (!selectedTeamId) {
      setSelectedTeamId(projectTeams[0].id);
    }
  }, [isTemplateMode, projectTeams, selectedTeamId]);

  useEffect(() => {
    if (selectedTeamId) {
      setTeamError(null);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    if (!isTemplateMode || !user) {
      return;
    }
    setStagedAssignee((previous) => {
      if (previous) {
        return previous;
      }
      return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        avatar_color: user.avatar_color ?? null,
      };
    });
  }, [isTemplateMode, user]);

  const [searchUsers, { loading: isSearchingMembers }] = useLazyQuery(SEARCH_USERS, {
    fetchPolicy: "no-cache",
  });

  const defaultTemplateTitle = useMemo(() => {
    if (!isTemplateMode) return "";
    const label = getWorkItemTypeLabel(templateType);
    return `Untitled ${label}`;
  }, [isTemplateMode, templateType]);

  const [stagedTitle, setStagedTitle] = useState(defaultTemplateTitle);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [stagedStatus, setStagedStatus] = useState<TaskStatus>("new");
  const [stagedAssignee, setStagedAssignee] = useState<Task["assignee"] | null>(null);
  const [stagedDescription, setStagedDescription] = useState("");
  const [stagedTags, setStagedTags] = useState<Array<{ id: string; name: string; color: string | null }>>([]);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [assigneeError, setAssigneeError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isAssigneeUpdating, setIsAssigneeUpdating] = useState(false);
  const [isDescriptionUpdating, setIsDescriptionUpdating] = useState(false);
  const [isTagsUpdating, setIsTagsUpdating] = useState(false);
  const [updatingTagId, setUpdatingTagId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [updatedByLabel, setUpdatedByLabel] = useState<string>("");
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const titleSizerRef = useRef<HTMLSpanElement | null>(null);

  const originalTagIdsSorted = useMemo(
    () => (task?.tags ?? []).map((tag) => tag.id).sort(),
    [task?.tags]
  );

  const stagedTagIdsSorted = useMemo(
    () => stagedTags.map((tag) => tag.id).sort(),
    [stagedTags]
  );

  useEffect(() => {
    if (!task) {
      setStagedTitle(defaultTemplateTitle);
      setIsEditingTitle(false);
      setTitleError(null);
      setStagedStatus("new");
      setStagedAssignee(null);
      setStagedDescription("");
      setStagedTags([]);
      setIsEditingDescription(false);
      setStatusError(null);
      setAssigneeError(null);
      setDescriptionError(null);
      setIsDescriptionUpdating(false);
      setTagsError(null);
      setIsTagsUpdating(false);
      setUpdatingTagId(null);
      setCommentText("");
      cancelEditComment();
      return;
    }

    setStagedStatus((task.status ?? "new") as TaskStatus);
    setStagedTitle(task.title ?? "");
    setIsEditingTitle(false);
    setTitleError(null);
    setStagedAssignee(task.assignee ?? null);
    setStagedDescription(task.description ?? "");
    setStagedTags(
      (task.tags ?? []).map((tag) => ({ id: tag.id, name: tag.name, color: tag.color ?? null }))
    );
    setIsEditingDescription(false);
    setStatusError(null);
    setAssigneeError(null);
    setDescriptionError(null);
    setIsDescriptionUpdating(false);
    setTagsError(null);
    setIsTagsUpdating(false);
    setUpdatingTagId(null);
    setCommentText("");
    cancelEditComment();
  }, [cancelEditComment, defaultTemplateTitle, setCommentText, task]);

  useEffect(() => {
    if (!task) {
      setUpdatedByLabel("");
      return;
    }
    const label = resolveUserLabel(user);
    const timestamp = task.updated_at ?? task.created_at ?? null;
    setUpdatedByLabel(buildUpdatedByLabel(label, timestamp));
  }, [task?.updated_at, task?.created_at, task?.id, user?.first_name, user?.last_name, user?.username]);

  useEffect(() => {
    if (isEditingTitle) {
      const id = window.setTimeout(() => {
        titleInputRef.current?.focus();
      }, 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [isEditingTitle]);

  const updateTitleWidth = useCallback(() => {
    if (!titleSizerRef.current || !titleInputRef.current) return;
    const measuredWidth = titleSizerRef.current.offsetWidth;
    const basePadding = 24;
    const width = Math.max(measuredWidth + basePadding, 120);
    titleInputRef.current.style.width = `${width}px`;
  }, [isEditingTitle]);

  useEffect(() => {
    updateTitleWidth();
  }, [updateTitleWidth, stagedTitle]);

  const [createWorkItemMutation] = useMutation(CREATE_WORK_ITEM);
  const [assignTagToWorkItemMutation] = useMutation(ASSIGN_TAG_TO_WORK_ITEM);
  const [updateTaskMutation] = useMutation(UPDATE_TASK);
  const [setTaskAssigneeMutation] = useMutation(SET_TASK_ASSIGNEE);
  const [assignTagToTaskMutation] = useMutation(ASSIGN_TAG_TO_TASK);
  const [removeTagFromTaskMutation] = useMutation(REMOVE_TAG_FROM_TASK);
  const [createTagMutation] = useMutation(ADD_TAG);
  const [updateTagMutation] = useMutation(UPDATE_TAG);
  const [addCommentMutation] = useMutation(ADD_COMMENT);
  const [updateCommentMutation] = useMutation(UPDATE_COMMENT);
  const [deleteCommentMutation] = useMutation(DELETE_COMMENT);

  const handleStatusChange = useCallback(
    (nextStatus: TaskStatus) => {
      setStatusError(null);
      setStagedStatus(nextStatus);
    },
    []
  );

  const handleTitleChange = useCallback((value: string) => {
    setStagedTitle(value);
    if (value.trim().length > 0) {
      setTitleError(null);
    }
  }, []);

  const {
    commentText,
    setCommentText,
    editingCommentId,
    editingCommentText,
    setEditingCommentText,
    startEditComment,
    cancelEditComment,
    submitNewComment,
    submitEditComment,
    deleteComment: deleteCommentById,
  } = useCommentEditor({
    async onAdd(content) {
      if (!taskId) return;
      await addCommentMutation({ variables: { task_id: taskId, content } });
      await refetchComments();
    },
    async onUpdate(commentId, content) {
      await updateCommentMutation({ variables: { id: commentId, content } });
      await refetchComments();
    },
    async onDelete(commentId) {
      await deleteCommentMutation({ variables: { id: commentId } });
      await refetchComments();
    },
  });

  const handleSubmitComment = submitNewComment;
  const handleStartEditComment = startEditComment;
  const handleCancelCommentEdit = cancelEditComment;
  const handleSubmitCommentEdit = submitEditComment;
  const handleDeleteComment = deleteCommentById;

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
        const { data } = await createTagMutation({
          variables: {
            project_id: projectId,
            name: trimmedName,
            color: trimmedColor || null,
          },
        });

        await refetchProjectTags().catch(() => undefined);

        const createdTag = data?.addTag;
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
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create tag";
        setTagsError(message);
        throw new Error(message);
      }
    },
    [createTagMutation, projectId, refetchProjectTags]
  );

  const handleUpdateTag = useCallback(
    async ({ id, name, color }: { id: string; name: string; color: string | null }) => {
      const currentTag =
        availableTags.find((candidate) => candidate.id === id) ??
        stagedTags.find((candidate) => candidate.id === id) ??
        null;
      const trimmedNameInput = name.trim();
      const resolvedName = trimmedNameInput || currentTag?.name?.trim() || "";
      if (!resolvedName) {
        const message = "Tag name is required";
        setTagsError(message);
        throw new Error(message);
      }
      const sanitizedColor = color?.trim() ?? "";

      setTagsError(null);
      setUpdatingTagId(id);
      try {
        const { data } = await updateTagMutation({
          variables: {
            id,
            name: resolvedName,
            color: sanitizedColor || null,
          },
        });

        await refetchProjectTags().catch(() => undefined);

        const updatedTag = data?.updateTag;
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
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update tag";
        setTagsError(message);
        throw new Error(message);
      } finally {
        setUpdatingTagId(null);
      }
    },
    [availableTags, refetchProjectTags, stagedTags, updateTagMutation]
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
      } catch (searchError) {
        console.error("Failed to search teammates", searchError);
        return [];
      }
    },
    [projectMembers, searchUsers]
  );

  const handleSave = useCallback(async () => {
    const trimmedTitle = stagedTitle.trim();
    const normalizedDescription = stagedDescription.trim();

    if (isTemplateMode) {
      const stagedTagIds = stagedTags.map((tag) => tag.id);
      if (!templateType || !projectId) {
        setTitleError("Work item context is missing.");
        return;
      }
      if (!trimmedTitle) {
        setTitleError("Title is required");
        return;
      }
      if (!selectedTeamId) {
        setTeamError("Select a team for this work item");
        return;
      }

      setTitleError(null);
      setTeamError(null);
      setTagsError(null);
      setIsSaving(true);
      try {
        const { data: createdData } = await createWorkItemMutation({
          variables: {
            input: {
              type: templateType,
              project_id: projectId,
              team_id: selectedTeamId,
              title: trimmedTitle,
              description: normalizedDescription.length > 0 ? normalizedDescription : null,
              status: stagedStatus,
              assignee_id: stagedAssignee?.id ?? null,
            },
          },
        });
        const created = createdData?.createWorkItem;
        if (created) {
          if (stagedTagIds.length > 0) {
            try {
              await Promise.all(
                stagedTagIds.map((tagId) =>
                  assignTagToWorkItemMutation({
                    variables: { work_item_id: created.id, tag_id: tagId },
                  })
                )
              );
            } catch (assignTagError) {
              console.error("Failed to assign tags to new work item", assignTagError);
            }
          }
          navigate(resolveWorkItemLink(projectId, created.id, created.type as WorkItemType));
        }
      } catch (createError) {
        console.error("Failed to create work item", createError);
        setTitleError(
          createError instanceof Error ? createError.message : "Failed to create work item"
        );
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!task || !user) return;

    const currentTitleValue = (task.title ?? "").trim();
    const currentStatusValue = (task.status ?? "new") as TaskStatus;
    const currentAssigneeId = task.assignee?.id ?? null;
    const stagedAssigneeId = stagedAssignee?.id ?? null;
    const normalizedCurrentDescription = (task.description ?? "").trim();
    const originalTagIds = (task.tags ?? []).map((tag) => tag.id);
    const stagedTagIds = stagedTags.map((tag) => tag.id);
    const originalTagIdSet = new Set(originalTagIds);
    const stagedTagIdSet = new Set(stagedTagIds);
    const tagsToAdd = stagedTagIds.filter((id) => !originalTagIdSet.has(id));
    const tagsToRemove = originalTagIds.filter((id) => !stagedTagIdSet.has(id));

    const titleChanged = trimmedTitle !== currentTitleValue;
    const statusChanged = stagedStatus !== currentStatusValue;
    const assigneeChanged = currentAssigneeId !== stagedAssigneeId;
    const descriptionChanged = normalizedDescription !== normalizedCurrentDescription;
    const tagsChanged = tagsToAdd.length > 0 || tagsToRemove.length > 0;

    if (titleChanged && trimmedTitle.length === 0) {
      setTitleError("Title is required");
      return;
    }

    if (!titleChanged && !statusChanged && !assigneeChanged && !descriptionChanged && !tagsChanged) {
      return;
    }

    setTitleError(null);
    setStatusError(null);
    setAssigneeError(null);
    setDescriptionError(null);
    setTagsError(null);
    setIsSaving(true);
    setIsStatusUpdating(statusChanged);
    setIsAssigneeUpdating(assigneeChanged);
    setIsDescriptionUpdating(descriptionChanged);
    setIsTagsUpdating(tagsChanged);

    let didUpdateTitle = false;
    let didUpdateStatus = false;
    let didUpdateAssignee = false;
    let didUpdateDescription = false;
    let didUpdateTags = false;
    let tagOperationError: string | null = null;

    if (titleChanged || statusChanged || descriptionChanged) {
      try {
        const variables: {
          id: string;
          title?: string;
          status?: TaskStatus;
          description?: string | null;
        } = { id: task.id };
        if (titleChanged) {
          variables.title = trimmedTitle;
        }
        if (statusChanged) {
          variables.status = stagedStatus;
        }
        if (descriptionChanged) {
          variables.description = normalizedDescription.length > 0 ? normalizedDescription : null;
        }
        await updateTaskMutation({
          variables,
        });
        if (titleChanged) {
          didUpdateTitle = true;
          setIsEditingTitle(false);
          setStagedTitle(trimmedTitle);
        }
        if (statusChanged) {
          didUpdateStatus = true;
        }
        if (descriptionChanged) {
          didUpdateDescription = true;
          setIsEditingDescription(false);
        }
      } catch (updateError) {
        console.error("Failed to update task details", updateError);
        const message =
          updateError instanceof Error ? updateError.message : "Failed to update task";
        if (titleChanged) {
          setTitleError(message);
        }
        if (statusChanged) {
          setStatusError(message);
        }
        if (descriptionChanged) {
          setDescriptionError(message);
        }
      }
    }

    if (assigneeChanged) {
      try {
        await setTaskAssigneeMutation({
          variables: { task_id: task.id, member_id: stagedAssigneeId },
        });
        didUpdateAssignee = true;
      } catch (assignError) {
        console.error("Failed to update task assignee", assignError);
        setAssigneeError(
          assignError instanceof Error ? assignError.message : "Failed to update assignee"
        );
      }
    }

    if (tagsChanged) {
      for (const tagId of tagsToAdd) {
        try {
          await assignTagToTaskMutation({
            variables: { task_id: task.id, tag_id: tagId },
          });
          didUpdateTags = true;
        } catch (assignTagError) {
          console.error("Failed to assign tag to task", assignTagError);
          const message =
            assignTagError instanceof Error ? assignTagError.message : "Failed to assign tag";
          tagOperationError = message;
        }
      }

      for (const tagId of tagsToRemove) {
        try {
          await removeTagFromTaskMutation({
            variables: { task_id: task.id, tag_id: tagId },
          });
          didUpdateTags = true;
        } catch (removeTagError) {
          console.error("Failed to remove tag from task", removeTagError);
          const message =
            removeTagError instanceof Error ? removeTagError.message : "Failed to remove tag";
          tagOperationError = message;
        }
      }

      if (tagOperationError) {
        setTagsError(tagOperationError);
      }
    }

    const shouldRefetch =
      didUpdateTitle || didUpdateStatus || didUpdateAssignee || didUpdateDescription || didUpdateTags;

    if (shouldRefetch) {
      const label = resolveUserLabel(user);
      setUpdatedByLabel(`Updated by ${label} just now`);
      await refetch({ id: task.id }).catch(() => undefined);
    }

    setIsSaving(false);
    setIsStatusUpdating(false);
    setIsAssigneeUpdating(false);
    setIsDescriptionUpdating(false);
    setIsTagsUpdating(false);
  }, [
    assignTagToTaskMutation,
    assignTagToWorkItemMutation,
    createWorkItemMutation,
    isTemplateMode,
    navigate,
    projectId,
    refetch,
    removeTagFromTaskMutation,
    selectedTeamId,
    setTaskAssigneeMutation,
    stagedAssignee,
    stagedDescription,
    stagedStatus,
    stagedTags,
    stagedTitle,
    task,
    templateType,
    updateTaskMutation,
    user,
  ]);

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

  if (!projectId) {
    return <div className="p-6 text-destructive">Project identifier is missing.</div>;
  }

  if (!taskId && !isTemplateMode) {
    return <div className="p-6 text-destructive">Task identifier is missing.</div>;
  }

  if (!user) {
    return (
      <Alert className="mt-4">
        <AlertTitle>Sign in required</AlertTitle>
        <AlertDescription>Sign in to view task details.</AlertDescription>
      </Alert>
    );
  }

  const headerLabel = isTemplateMode ? getWorkItemTypeLabel(templateType) : "Work item";
  const { icon: HeaderIcon, colorClass: headerIconClass } = getWorkItemIconMeta(
    isTemplateMode ? templateType ?? undefined : task?.type ?? undefined
  );
  const headerTimeLabel = updatedByLabel || (isTemplateMode ? "Not yet saved" : "Not yet updated");
  const sprintLabel = task?.sprint?.name ?? "Not added to a sprint";
  const dueDateLabel = formatDate(task?.due_date);
  const priorityLabel = getPriorityLabel(task?.priority ?? null);
  const estimateValue = task?.estimate;
  const estimateLabel = typeof estimateValue === "number" ? estimateValue : "Not set";
  const taskIdentifierLabel = task?.id ? `#${task.id}` : "Not created yet";

  const hasTags = stagedTags.length > 0;
  const currentAssignee = task?.assignee ?? null;
  const currentStatus = (task?.status ?? "new") as TaskStatus;
  const stagedAssigneeId = stagedAssignee?.id ?? null;
  const currentAssigneeId = currentAssignee?.id ?? null;
  const normalizedStagedTitle = stagedTitle.trim();
  const normalizedTaskTitle = (task?.title ?? "").trim();
  const hasTitleChanged = task
    ? normalizedStagedTitle !== normalizedTaskTitle
    : normalizedStagedTitle.length > 0;
  const hasStatusChanged = task ? stagedStatus !== currentStatus : false;
  const hasAssigneeChanged = task ? currentAssigneeId !== stagedAssigneeId : false;
  const normalizedStagedDescription = stagedDescription.trim();
  const normalizedTaskDescription = (task?.description ?? "").trim();
  const hasDescriptionChanged = task
    ? normalizedStagedDescription !== normalizedTaskDescription
    : normalizedStagedDescription.length > 0;
  const hasTagsChanged = task
    ? stagedTagIdsSorted.length !== originalTagIdsSorted.length ||
      stagedTagIdsSorted.some((id, index) => id !== originalTagIdsSorted[index])
    : false;
  const templateHasChanges =
    normalizedStagedTitle.length > 0 ||
    normalizedStagedDescription.length > 0 ||
    stagedAssigneeId !== null ||
    stagedStatus !== "new";
  const hasUnsavedChanges = task
    ? hasTitleChanged || hasStatusChanged || hasAssigneeChanged || hasDescriptionChanged || hasTagsChanged
    : templateHasChanges;
  const isSaveDisabled = isTemplateMode
    ? normalizedStagedTitle.length === 0 || !selectedTeamId || isSaving
    : !task || !hasUnsavedChanges || isSaving;
  const isTagTriggerDisabled = isSaving || isTagsUpdating || (!isTemplateMode && !task);
  const addTagTrigger = hasTags ? (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      disabled={isTagTriggerDisabled}
      className="h-7 w-7 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
      aria-label="Add tag"
    >
      <Plus size={14} />
    </Button>
  ) : (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={isTagTriggerDisabled}
      className="gap-1 border-dashed border-border/60 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary"
    >
      <Plus className="h-3.5 w-3.5" />
      Add tag
    </Button>
  );
  const stateSection = (
    <div className="flex min-w-[11rem] flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">State</span>
      <TaskStatusDropdown
        value={stagedStatus}
        onChange={handleStatusChange}
        isUpdating={isStatusUpdating}
        disabled={isSaving}
        triggerClassName="rounded-full bg-muted/40 px-4 py-2 text-sm"
      />
      {statusError ? <span className="text-xs text-destructive">{statusError}</span> : null}
    </div>
  );
  const assigneeSection = (
    <div className="flex min-w-[14rem] flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Assignee</span>
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
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          className="gap-2 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => navigate(`/projects/${projectId}/work-items`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to work items
        </Button>
      </div>

      {error && !isTemplateMode ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load task</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? <TaskDetailsSkeleton /> : null}

      {!loading && !task && !isTemplateMode ? (
        <Alert>
          <AlertTitle>Task not found</AlertTitle>
          <AlertDescription>
            We couldn&apos;t locate this task. It may have been deleted or you might not have access.
          </AlertDescription>
        </Alert>
      ) : null}

      {!loading && (task || isTemplateMode) ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-border/70 bg-[hsl(var(--card))] p-6 shadow-sm">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <HeaderIcon className={`h-3.5 w-3.5 ${headerIconClass}`} />
                    <span>{headerLabel}</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleSave()}
                    disabled={isSaveDisabled}
                    className="inline-flex items-center gap-2 rounded-full px-4"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isSaving ? (task ? "Saving…" : "Creating…") : task ? "Save" : "Create"}
                  </Button>
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
                              setStagedTitle(task?.title ?? "");
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
                                    disabled={!task || isSaving || isTagsUpdating || isUpdatingCurrentTag}
                                    className="pointer-events-auto h-[14px] w-[14px] rounded-sm border border-transparent text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                                    aria-label={`Remove ${tag.name}`}
                                  >
                                    <X size={9} strokeWidth={2} />
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
                    {isTemplateMode ? (
                      <>
                        {assigneeSection}
                        {stateSection}
                      </>
                    ) : (
                      <>
                        {stateSection}
                        {assigneeSection}
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground lg:text-right">{headerTimeLabel}</p>
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
                        onChange={(event) => setStagedDescription(event.target.value)}
                        placeholder="Add background context, goals, or implementation notes for this work item."
                        className="min-h-[160px] resize-y"
                        disabled={isSaving}
                      />
                      {descriptionError ? (
                        <p className="text-sm text-destructive">{descriptionError}</p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => void handleSave()}
                          disabled={isSaving || isDescriptionUpdating || (!hasDescriptionChanged && !isTemplateMode)}
                          className="inline-flex items-center gap-2"
                        >
                          {isDescriptionUpdating || isSaving ? (
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
                          onClick={() => {
                            setIsEditingDescription(false);
                            setStagedDescription(task?.description ?? "");
                            setDescriptionError(null);
                          }}
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
                        if (isSaving) return;
                        setIsEditingDescription(true);
                        if (task) {
                          setStagedDescription(task.description ?? "");
                        }
                        setDescriptionError(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          if (isSaving) return;
                          setIsEditingDescription(true);
                          if (task) {
                            setStagedDescription(task.description ?? "");
                          }
                          setDescriptionError(null);
                        }
                      }}
                    >
                      {task?.description?.trim() ? (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                          {task?.description}
                        </div>
                      ) : (
                        <p className="text-sm italic text-muted-foreground">
                          Add background context, goals, or implementation notes for this work item.
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
                    Capture the checklist that must be true before this task can be considered complete.
                  </p>
                </CardContent>
              </Card>

              {isTemplateMode ? (
                <Card className="border border-border/60">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-foreground">Discussion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Comments will be available once you create this work item.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border border-border/60">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-foreground">Discussion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TaskCommentsPanel
                      comments={comments}
                      loading={commentsLoading}
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
              )}
            </div>

            <div className="space-y-6">
              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-3 text-sm">
                    {isTemplateMode ? (
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Team</dt>
                        <dd className="mt-1 space-y-1">
                          {isProjectTeamsLoading ? (
                            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading teams…
                            </span>
                          ) : projectTeams.length > 0 ? (
                            <select
                              value={selectedTeamId}
                              onChange={(event) => setSelectedTeamId(event.target.value)}
                              disabled={isSaving || isProjectTeamsLoading}
                              className="w-full rounded-md border border-border bg-[hsl(var(--card))] px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                              <option value="">Select a team</option>
                              {projectTeams.map((team) => (
                                <option key={team.id} value={team.id}>
                                  {team.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              No teams available. Ask a project admin to create one.
                            </span>
                          )}
                          {teamError ? <p className="text-xs text-destructive">{teamError}</p> : null}
                        </dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Assignee</dt>
                      <dd className="mt-1 text-foreground">
                        {stagedAssignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8 border border-border/60">
                              <AvatarFallback
                                className="text-xs font-semibold uppercase text-primary"
                                style={{ backgroundColor: stagedAssignee.avatar_color ?? DEFAULT_AVATAR_COLOR }}
                              >
                                {getInitials(stagedAssignee)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col leading-tight">
                              <span className="text-sm font-medium text-foreground">
                                {getFullName(stagedAssignee) || stagedAssignee.username}
                              </span>
                              <span className="text-xs text-muted-foreground">@{stagedAssignee.username}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Priority</dt>
                      <dd className="mt-1 text-foreground">{priorityLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Estimate</dt>
                      <dd className="mt-1 text-foreground">{estimateLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Due date</dt>
                      <dd className="mt-1 text-foreground">{dueDateLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Stage</dt>
                      <dd className="mt-1 text-foreground">{stageLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Sprint</dt>
                      <dd className="mt-1 text-foreground">{sprintLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Task ID</dt>
                      <dd className="mt-1 text-muted-foreground">{taskIdentifierLabel}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">Related work</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Link upstream dependencies, specs, or pull requests so the team can trace work across tools.
                  </p>
                  <Button type="button" size="sm" variant="outline" disabled className="w-full cursor-not-allowed">
                    Add link (coming soon)
                  </Button>
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
