import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useApolloClient, useLazyQuery } from "@apollo/client";
import type { Task, AuthUser, User } from "@shared/types";

import {
  GET_COMMENTS,
  ADD_COMMENT,
  DELETE_COMMENT,
  UPDATE_COMMENT,
  UPDATE_TASK,
  GET_TASK_TAGS,
  REMOVE_TAG_FROM_TASK,
  SET_TASK_ASSIGNEE,
  GENERATE_TASK_DRAFT,
  ADD_TAG_TO_TASK,
  GET_PROJECT_MEMBERS,
  SEARCH_USERS,
  GET_WORKFLOWS,
  GET_TASKS,
} from "../../graphql";
import { useModal } from "../ModalStack";
import { TASK_FRAGMENT } from "../../graphql/tasks";
import type { CommentWithUser, TaskDraftResponse } from "./types";

const TAG_COLOR_PALETTE = [
  "#38BDF8",
  "#22D3EE",
  "#34D399",
  "#FBBF24",
  "#F472B6",
  "#A855F7",
  "#60A5FA",
];

const getColorForTagByIndex = (index: number): string => {
  return TAG_COLOR_PALETTE[index % TAG_COLOR_PALETTE.length];
};

export const TASK_TITLE_MAX_LENGTH = 512;

type ProjectMember = Pick<User, "id" | "first_name" | "last_name" | "username" | "avatar_color">;

interface UseTaskModalControllerParams {
  task: Task | null;
  currentUser: AuthUser | null;
  onTaskUpdate?: (task: Task) => void;
}

interface TaskDialogControls {
  isOpen: boolean;
  handleClose: () => Promise<void>;
  handleDialogOpenChange: (open: boolean) => void;
}

interface TitleControls {
  value: string;
  isEditing: boolean;
  canCommit: boolean;
  startEdit: () => void;
  change: (value: string) => void;
  commit: () => Promise<void>;
  cancel: () => void;
}

interface DescriptionControls {
  value: string;
  initialValue: string;
  isEditing: boolean;
  isExpanded: boolean;
  toggleExpanded: () => void;
  change: (value: string) => void;
  startEdit: (reset?: boolean) => void;
  save: () => Promise<void>;
  cancel: () => void;
}

interface DraftControls {
  suggestions: string[];
  isPromptVisible: boolean;
  prompt: string;
  error: string | null;
  isGenerating: boolean;
  togglePrompt: () => void;
  changePrompt: (value: string) => void;
  cancelPrompt: () => void;
  generateDraft: () => Promise<void>;
}

interface MetaControls {
  dueDate: string;
  priority: Task["priority"] | null;
  status: Task["status"];
  statusError: string | null;
  isStatusUpdating: boolean;
  handleStatusChange: (nextStatus: Task["status"]) => Promise<void>;
  clearDueDate: () => Promise<void>;
  handleDueDateSave: (nextDate: string | null) => Promise<void>;
}

interface AssigneeControls {
  assignee: Task["assignee"] | null;
  projectMembers: ProjectMember[];
  isMembersLoading: boolean;
  isAssigning: boolean;
  isSearchingMembers: boolean;
  handleSearchMembers: (query: string) => Promise<ProjectMember[]>;
  handleAssignMember: (memberId: string | null) => Promise<void>;
  clearAssignee: () => void;
}

interface TagControls {
  tags: { id: string; name: string; color: string | null }[];
  hasTags: boolean;
  removeTag: (tagId: string) => Promise<void>;
  openTagModal: () => void;
}

interface CommentControls {
  comments: CommentWithUser[];
  loading: boolean;
  commentText: string;
  changeCommentText: (value: string) => void;
  submitComment: () => Promise<void>;
  editingCommentId: string | null;
  editingCommentText: string;
  changeEditingCommentText: (value: string) => void;
  startEditComment: (commentId: string, content: string | null) => void;
  cancelEditComment: () => void;
  submitCommentEdit: () => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
}

interface ModalShortcuts {
  openDueDateModal: () => void;
}

export interface TaskModalController {
  dialog: TaskDialogControls;
  title: TitleControls;
  description: DescriptionControls;
  draft: DraftControls;
  meta: MetaControls;
  assignee: AssigneeControls;
  tags: TagControls;
  comments: CommentControls;
  dueDateModal: ModalShortcuts;
  currentUserId: string | null;
  task: Task | null;
}

export function useTaskModalController({
  task,
  currentUser,
  onTaskUpdate,
}: UseTaskModalControllerParams): TaskModalController {
  const { modals, closeModal, openModal } = useModal();
  const isOpen = modals.includes("task");
  const currentUserId = currentUser?.id ?? null;
  const client = useApolloClient();

  const [title, setTitle] = useState("");
  const [initialTitle, setInitialTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [description, setDescription] = useState("");
  const [initialDescription, setInitialDescription] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Task["priority"] | null>(null);
  const [status, setStatus] = useState<Task["status"]>("new");
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [tags, setTags] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [subtaskSuggestions, setSubtaskSuggestions] = useState<string[]>([]);
  const [isDraftPromptVisible, setIsDraftPromptVisible] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isAssigningAssignee, setIsAssigningAssignee] = useState(false);

  const { data, loading, refetch } = useQuery(GET_COMMENTS, {
    variables: { task_id: task?.id },
    skip: !task,
  });

  const { data: tagsData } = useQuery(GET_TASK_TAGS, {
    variables: { task_id: task?.id },
    skip: !task,
  });

  const projectId = task?.project_id ?? null;

  const { data: projectMembersData, loading: isMembersLoading } = useQuery(GET_PROJECT_MEMBERS, {
    variables: { project_id: projectId },
    skip: !isOpen || !projectId,
  });

  const projectMembers = useMemo(
    () => (projectMembersData?.projectMembers ?? []) as ProjectMember[],
    [projectMembersData]
  );

  const [searchUsersLazy, { loading: isSearchingMembers }] = useLazyQuery(SEARCH_USERS, {
    fetchPolicy: "no-cache",
  });

  const handleSearchMembers = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        return projectMembers;
      }

      try {
        const { data: searchData } = await searchUsersLazy({
          variables: { query: trimmed },
        });

        const results = (searchData?.searchUsers ?? []) as ProjectMember[];
        const seen = new Set<string>();
        return results.filter((user) => {
          if (seen.has(user.id)) {
            return false;
          }
          seen.add(user.id);
          return true;
        });
      } catch (error) {
        console.error("Failed to search users", error);
        return [];
      }
    },
    [projectMembers, searchUsersLazy]
  );

  const [addComment] = useMutation(ADD_COMMENT);
  const [deleteCommentMutation] = useMutation(DELETE_COMMENT);
  const [updateCommentMutation] = useMutation(UPDATE_COMMENT);

  const [updateTask] = useMutation(UPDATE_TASK);
  const [removeTagFromTask] = useMutation(REMOVE_TAG_FROM_TASK);
  const [setTaskAssigneeMutation] = useMutation(SET_TASK_ASSIGNEE);
  const [addTagToTaskMutation] = useMutation(ADD_TAG_TO_TASK);
  const [generateTaskDraftMutation, { loading: isGeneratingDraft }] =
    useMutation(GENERATE_TASK_DRAFT);

  const writeTaskToCache = useCallback(
    (next: Task) => {
      const cacheId = client.cache.identify({ __typename: "Task", id: next.id });
      if (!cacheId) {
        return;
      }

      let data: Task & { stage?: Task["stage"] | null } = next;
      const existing = client.cache.readFragment<Task & { stage?: Task["stage"] | null; sprint?: Task["sprint"] | null } | null>({
        id: cacheId,
        fragment: TASK_FRAGMENT,
      });

      if (!(next as unknown as { stage?: Task["stage"] | null }).stage && existing?.stage) {
        data = { ...data, stage: existing.stage } as Task & { stage?: Task["stage"] | null };
      }
      if (!(next as unknown as { sprint?: Task["sprint"] | null }).sprint && existing?.sprint) {
        data = { ...data, sprint: existing.sprint } as Task & { sprint?: Task["sprint"] | null };
      }

      const stageValue =
        (data as { stage?: Task["stage"] | null }).stage ?? existing?.stage ?? null;
      const sprintValue =
        (data as { sprint?: Task["sprint"] | null }).sprint ?? (existing as { sprint?: Task["sprint"] | null })?.sprint ?? null;

      const normalizedTask = {
        ...(existing ?? {}),
        ...data,
        status: data.status ?? "new",
        stage_id: data.stage_id ?? null,
        backlog_id: data.backlog_id ?? null,
        sprint_id: data.sprint_id ?? null,
        estimate: data.estimate ?? null,
        assignee_id: data.assignee_id ?? null,
        assignee: data.assignee ?? null,
        stage: stageValue,
        sprint: sprintValue,
        created_at: data.created_at ?? existing?.created_at ?? null,
        updated_at: data.updated_at ?? existing?.updated_at ?? null,
        project_id: data.project_id ?? existing?.project_id ?? task?.project_id ?? null,
        team_id: data.team_id ?? existing?.team_id ?? task?.team_id ?? null,
        position: data.position ?? existing?.position ?? 0,
        tags: data.tags && data.tags.length > 0 ? data.tags : existing?.tags ?? [],
      } as Task;

      client.cache.writeFragment({
        id: cacheId,
        fragment: TASK_FRAGMENT,
        data: {
          ...normalizedTask,
          __typename: "Task",
        },
      });
      onTaskUpdate?.(normalizedTask);
    },
    [client, onTaskUpdate]
  );

  const mutateTask = useCallback(
    async (
      variables: Partial<
        Pick<
          Task,
          "title" | "description" | "due_date" | "priority" | "estimate" | "stage_id" | "backlog_id" | "sprint_id" | "status"
        >
      >
    ) => {
      if (!task) return null;

      const context = {
        stage_id: task.stage_id ?? null,
        backlog_id: task.backlog_id ?? null,
        sprint_id: task.sprint_id ?? null,
        estimate: task.estimate ?? null,
      } as Partial<Task>;

      const { data: mutationData } = await updateTask({
        variables: {
          id: task.id,
          ...context,
          ...variables,
        },
      });
      const updated = mutationData?.updateTask as Task | undefined;
      if (updated) {
        writeTaskToCache(updated);
      }
      return updated ?? null;
    },
    [task, updateTask, writeTaskToCache]
  );

  const applySuggestedTags = useCallback(
    async (candidates: string[], baseTask?: Task) => {
      if ((!task && !baseTask) || candidates.length === 0) {
        return;
      }

      const targetTaskId = task?.id ?? baseTask?.id ?? null;
      if (!targetTaskId) {
        return;
      }

      let nextTags = tags;

      const colorAssignments = new Map<string, string>();

      candidates.forEach((candidate, index) => {
        const normalized = candidate.trim().toLowerCase();
        if (!normalized || colorAssignments.has(normalized)) {
          return;
        }
        colorAssignments.set(normalized, getColorForTagByIndex(index));
      });

      for (const candidate of candidates) {
        const trimmed = candidate.trim();
        if (!trimmed) {
          continue;
        }

        if (nextTags.some((tag) => tag.name.toLowerCase() === trimmed.toLowerCase())) {
          continue;
        }

        const color = colorAssignments.get(trimmed.toLowerCase()) ?? getColorForTagByIndex(0);

        const { data } = await addTagToTaskMutation({
          variables: {
            task_id: targetTaskId,
            name: trimmed,
            color,
          },
        });

        const updatedTask = data?.addTagToTask as Task | undefined;
        if (updatedTask?.tags) {
          nextTags = (updatedTask.tags ?? []).map((tag) => ({
            ...tag,
            color: tag.color ?? null,
          })) as {
            id: string;
            name: string;
            color: string | null;
          }[];
        }
      }

      if (nextTags !== tags) {
        setTags(nextTags);
        const sourceTask = baseTask
          ? baseTask
          : (task
              ? {
                  ...task,
                  title,
                  description,
                  due_date: dueDate ? dueDate : null,
                  priority,
                  status,
                }
              : null);
        if (sourceTask) {
          const nextTask = {
            ...sourceTask,
            tags: nextTags,
            stage: (sourceTask as unknown as { stage?: Task["stage"] | null }).stage ?? null,
          } as Task;
          writeTaskToCache(nextTask);
        }
      }
    },
    [
      task,
      tags,
      addTagToTaskMutation,
      writeTaskToCache,
      title,
      description,
      dueDate,
      priority,
      status,
    ]
  );

  const toggleDraftPrompt = useCallback(() => {
    setDraftError(null);
    setIsDraftPromptVisible((prev) => !prev);
  }, []);

  const cancelDraftPrompt = useCallback(() => {
    setIsDraftPromptVisible(false);
    setDraftError(null);
  }, []);

  const handleGenerateDraft = useCallback(async () => {
    if (!task) return;
    const trimmedPrompt = draftPrompt.trim();
    if (!trimmedPrompt) {
      setDraftError("Add a short summary so the assistant can help.");
      return;
    }

    setDraftError(null);

    try {
      const { data: draftData } = await generateTaskDraftMutation({
        variables: {
          input: {
            prompt: trimmedPrompt,
            project_id: task.project_id,
            stage_id: task.stage_id,
          },
        },
      });

      const suggestion = draftData?.generateTaskDraft as TaskDraftResponse | undefined;

      if (!suggestion) {
        setDraftError("The assistant didn't return a draft. Try refining the prompt.");
        return;
      }

      const nextTitle = suggestion.title?.slice(0, TASK_TITLE_MAX_LENGTH).trim() ?? null;
      const descriptionCandidate = (() => {
        if (suggestion.description === undefined) return undefined;
        if (suggestion.description === null) return null;
        return suggestion.description.trim();
      })();
      const normalizedPriority = (() => {
        const value = suggestion.priority?.toLowerCase();
        return value === "low" || value === "medium" || value === "high"
          ? (value as Task["priority"])
          : null;
      })();

      let normalizedDueDate: string | null | undefined = undefined;
      if ("due_date" in suggestion) {
        const trimmedDue = suggestion.due_date?.trim() ?? "";
        normalizedDueDate = trimmedDue ? trimmedDue : null;
      }

      const updatePayload: Partial<Pick<Task, "title" | "description" | "due_date" | "priority">> = {};
      if (nextTitle) {
        updatePayload.title = nextTitle;
      }
      if (descriptionCandidate !== undefined) {
        updatePayload.description = descriptionCandidate ? descriptionCandidate : null;
      }
      if (normalizedDueDate !== undefined) {
        updatePayload.due_date = normalizedDueDate;
      }
      if (suggestion.priority !== undefined && normalizedPriority) {
        updatePayload.priority = normalizedPriority;
      }

      const updatedTask =
        Object.keys(updatePayload).length > 0 ? await mutateTask(updatePayload) : null;

      const baseTask = task as Task;
      const finalTask = (updatedTask ?? {
        ...baseTask,
        ...(nextTitle ? { title: nextTitle } : {}),
        ...(descriptionCandidate !== undefined
          ? { description: descriptionCandidate ? descriptionCandidate : null }
          : {}),
        ...(normalizedDueDate !== undefined ? { due_date: normalizedDueDate } : {}),
        ...(suggestion.priority !== undefined && normalizedPriority
          ? { priority: normalizedPriority }
          : {}),
      }) as Task;

      const finalTitle = finalTask.title ?? "";
      setTitle(finalTitle.slice(0, TASK_TITLE_MAX_LENGTH));
      setInitialTitle(finalTitle.slice(0, TASK_TITLE_MAX_LENGTH));

      const finalDescription = finalTask.description ?? "";
      setDescription(finalDescription);
      setInitialDescription(finalDescription);
      setIsEditingDescription(false);

      const finalDueDate = finalTask.due_date ? finalTask.due_date.slice(0, 10) : "";
      setDueDate(finalDueDate);
      setPriority(finalTask.priority ?? null);
      setStatus(finalTask.status ?? "new");

      const nextTagState = Array.isArray(finalTask.tags)
        ? finalTask.tags.map((tag) => ({
            ...tag,
            color: tag.color ?? null,
          }))
        : tags;

      if (Array.isArray(finalTask.tags)) {
        setTags(nextTagState);
      }

      const normalizedTaskForCache = {
        ...finalTask,
        project_id: finalTask.project_id ?? task?.project_id ?? null,
        team_id: finalTask.team_id ?? task?.team_id ?? null,
        stage_id: finalTask.stage_id ?? task?.stage_id ?? null,
        sprint_id: finalTask.sprint_id ?? task?.sprint_id ?? null,
        stage: (finalTask as { stage?: Task["stage"] | null }).stage ?? (task as unknown as { stage?: Task["stage"] | null })?.stage ?? null,
        sprint: (finalTask as { sprint?: Task["sprint"] | null }).sprint ?? (task as unknown as { sprint?: Task["sprint"] | null })?.sprint ?? null,
        created_at: finalTask.created_at ?? task?.created_at ?? null,
        updated_at: finalTask.updated_at ?? task?.updated_at ?? null,
        position: finalTask.position ?? task?.position ?? 0,
        tags: nextTagState,
      } as Task;
      writeTaskToCache(normalizedTaskForCache);

      const tagCandidates = Array.isArray(suggestion.tags)
        ? suggestion.tags.map((tag) => tag.trim()).filter(Boolean)
        : [];
      const existingTagNames = new Set(nextTagState.map((tag) => tag.name.toLowerCase()));
      const uniqueCandidates = Array.from(new Set(tagCandidates.map((tag) => tag)))
        .map((candidate) => candidate.trim())
        .filter((candidate) => candidate && !existingTagNames.has(candidate.toLowerCase()));

      await applySuggestedTags(uniqueCandidates, normalizedTaskForCache);
      const subtaskCandidates = Array.isArray(suggestion.subtasks)
        ? suggestion.subtasks.map((taskTitle) => taskTitle.trim()).filter(Boolean)
        : [];
      setSubtaskSuggestions(Array.from(new Set(subtaskCandidates)));

      setDraftPrompt("");
      setIsDraftPromptVisible(false);
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : "Failed to generate a draft.");
    }
  }, [
    task,
    draftPrompt,
    generateTaskDraftMutation,
    tags,
    applySuggestedTags,
    mutateTask,
    writeTaskToCache,
  ]);

  useEffect(() => {
    if (task) {
      const titleValue = task.title || "";
      setTitle(titleValue.slice(0, TASK_TITLE_MAX_LENGTH));
      setInitialTitle(titleValue.slice(0, TASK_TITLE_MAX_LENGTH));
      setDescription(task.description ?? "");
      setInitialDescription(task.description ?? "");
      setIsDescriptionExpanded(false);
      const normalizedDueDate = task.due_date ? task.due_date.slice(0, 10) : "";
      setDueDate(normalizedDueDate);
      setPriority(task.priority ?? null);
      setStatus(task.status ?? "new");
      setEditingCommentId(null);
      setEditingCommentText("");
      setCommentText("");
      setIsEditingDescription(false);
      setSubtaskSuggestions([]);
      setDraftPrompt("");
      setDraftError(null);
      setIsDraftPromptVisible(false);
      setStatusError(null);
      setStatusUpdating(false);
    }
  }, [task]);

  useEffect(() => {
    if (tagsData?.task?.tags) {
      setTags(tagsData.task.tags);
    }
  }, [tagsData]);

  const saveAllChanges = useCallback(async () => {
    if (!task) return;
    const trimmedTitle = title.trim();
    const normalizedDescription = description.trim();
    const currentDescription = (task.description ?? "").trim();
    const currentDue = task.due_date ? task.due_date.slice(0, 10) : "";

    const payload: Partial<Pick<Task, "title" | "description" | "due_date" | "priority" | "status">> = {};
    let shouldMutate = false;

    if (!trimmedTitle) {
      setTitle(initialTitle);
    } else if (trimmedTitle !== initialTitle) {
      payload.title = trimmedTitle;
      shouldMutate = true;
    }

    if (normalizedDescription !== currentDescription) {
      payload.description = normalizedDescription;
      shouldMutate = true;
    }

    if (dueDate !== currentDue) {
      payload.due_date = dueDate || null;
      shouldMutate = true;
    }

    if (priority !== (task.priority ?? null)) {
      payload.priority = priority ?? null;
      shouldMutate = true;
    }

    if (status !== (task.status ?? "new")) {
      payload.status = status ?? "new";
      shouldMutate = true;
    }

    if (shouldMutate) {
      const updated = await mutateTask(payload);
      if (updated) {
        const nextTitle = updated.title ?? "";
        setInitialTitle(nextTitle.slice(0, TASK_TITLE_MAX_LENGTH));
        setTitle(nextTitle.slice(0, TASK_TITLE_MAX_LENGTH));
        const nextDescription = updated.description ?? "";
        setInitialDescription(nextDescription);
        setDescription(nextDescription);
        const nextDue = updated.due_date ? updated.due_date.slice(0, 10) : "";
        setDueDate(nextDue);
        setPriority(updated.priority ?? null);
        setStatus(updated.status ?? "new");
      }
    }
  }, [
    task,
    title,
    initialTitle,
    description,
    dueDate,
    priority,
    status,
    mutateTask,
  ]);

  const handleClose = useCallback(async () => {
    await saveAllChanges();
    closeModal("task");
  }, [closeModal, saveAllChanges]);

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        void handleClose();
      }
    },
    [handleClose]
  );

  const cancelTitleEdit = () => {
    setTitle(initialTitle);
    setIsEditingTitle(false);
  };

  const commitTitle = useCallback(async () => {
    if (!task) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(initialTitle);
      setIsEditingTitle(false);
      return;
    }
    if (trimmed.length > TASK_TITLE_MAX_LENGTH) {
      setTitle(initialTitle);
      setIsEditingTitle(false);
      return;
    }
    if (trimmed !== initialTitle) {
      const updated = await mutateTask({ title: trimmed });
      if (updated) {
        const nextTitle = updated.title ?? "";
        setInitialTitle(nextTitle.slice(0, TASK_TITLE_MAX_LENGTH));
        setTitle(nextTitle.slice(0, TASK_TITLE_MAX_LENGTH));
        setStatus(updated.status ?? status);
      }
    }
    setIsEditingTitle(false);
  }, [task, title, initialTitle, status, mutateTask]);

  const commitDescription = useCallback(async () => {
    if (!task) return;
    const trimmed = description.trim();
    if (trimmed === initialDescription.trim()) {
      setIsEditingDescription(false);
      setDescription(trimmed);
      return;
    }

    const updated = await mutateTask({ description: trimmed });
    if (updated) {
      const nextDescription = updated.description ?? "";
      setInitialDescription(nextDescription);
      setDescription(nextDescription);
      setStatus(updated.status ?? status);
    }
    setIsEditingDescription(false);
  }, [task, description, initialDescription, status, mutateTask]);

  const handleDueDateSave = useCallback(
    async (nextDate: string | null) => {
      if (!task) return;
      const normalized = nextDate?.trim() ? nextDate.trim() : null;
      const current = dueDate.trim() ? dueDate.trim() : null;

      if (normalized === current) return;

      const fallbackDue = normalized ? normalized.slice(0, 10) : "";
      setDueDate(fallbackDue);
      const optimisticTask = {
        ...(task as Task),
        due_date: normalized,
      } as Task;
      writeTaskToCache(optimisticTask);

      const updated = await mutateTask({ due_date: normalized });

      if (updated) {
        setStatus(updated.status ?? status);
        const nextDue = updated.due_date ? updated.due_date.slice(0, 10) : "";
        const previousDue = current ?? "";

        if (nextDue === fallbackDue) {
          writeTaskToCache(updated as Task);
          return;
        }

        if (nextDue === previousDue) {
          const nextTask = {
            ...(updated as Task),
            due_date: normalized,
          } as Task;
          writeTaskToCache(nextTask);
          return;
        }

        setDueDate(nextDue);
        writeTaskToCache(updated as Task);
        return;
      }

      // retain optimistic state if mutation returned no data
    },
    [task, dueDate, status, mutateTask, writeTaskToCache]
  );

  const handleStatusChange = useCallback(
    async (nextStatus: Task["status"]) => {
      if (!task) return;
      const previousStatus = status;
      if (nextStatus === previousStatus) return;

      setStatusError(null);
      setStatus(nextStatus);
      setStatusUpdating(true);

      const optimisticTask = {
        ...(task as Task),
        status: nextStatus,
      } as Task;
      writeTaskToCache(optimisticTask);

      try {
        const updated = await mutateTask({ status: nextStatus });
        if (updated) {
          setStatus(updated.status ?? nextStatus);
        }
      } catch (error) {
        const fallbackTask = {
          ...(task as Task),
          status: previousStatus,
        } as Task;
        writeTaskToCache(fallbackTask);
        setStatus(previousStatus);
        setStatusError(error instanceof Error ? error.message : "Unable to update status.");
      } finally {
        setStatusUpdating(false);
      }
    },
    [task, status, mutateTask, writeTaskToCache]
  );

  const submitComment = useCallback(async () => {
    if (!task) return;
    const trimmed = commentText.trim();
    if (!trimmed) return;
    await addComment({ variables: { task_id: task.id, content: trimmed } });
    await refetch();
    setCommentText("");
  }, [task, commentText, addComment, refetch]);

  const assignee = task?.assignee ?? null;
  const hasTags = tags.length > 0;
  const comments = (data?.task?.comments ?? []) as CommentWithUser[];

  const handleRemoveTag = useCallback(
    async (tagId: string) => {
      if (!task) return;

      const { data: removeData } = await removeTagFromTask({
        variables: { task_id: task.id, tag_id: tagId },
      });

      const updatedTags = removeData?.removeTagFromTask?.tags ?? tags.filter((tag) => tag.id !== tagId);
      setTags(updatedTags);
      const nextTask = {
        ...task,
        tags: updatedTags,
        stage: (task as unknown as { stage?: Task["stage"] | null }).stage ?? null,
      } as Task;
      writeTaskToCache(nextTask);
    },
    [task, removeTagFromTask, tags, writeTaskToCache]
  );

  const handleAssignMember = useCallback(
    async (memberId: string | null) => {
      if (!task) return;

      const currentAssigneeId = task.assignee?.id ?? null;
      if (currentAssigneeId === memberId) {
        return;
      }

      try {
        setIsAssigningAssignee(true);
        const { data: assignData } = await setTaskAssigneeMutation({
          variables: { task_id: task.id, member_id: memberId },
          refetchQueries:
            task.project_id != null
              ? [
                  { query: GET_WORKFLOWS, variables: { project_id: task.project_id } },
                  { query: GET_TASKS, variables: {} },
                  { query: GET_TASKS, variables: { project_id: task.project_id } },
                ]
              : undefined,
        });

        const updatedTask = assignData?.setTaskAssignee as Task | undefined;
        if (updatedTask) {
          writeTaskToCache(updatedTask);
        } else {
          const fallbackTask = {
            ...task,
            assignee_id: memberId,
            assignee:
              memberId === null
                ? null
                : projectMembers.find((member) => member.id === memberId) ?? task.assignee ?? null,
            stage: (task as unknown as { stage?: Task["stage"] | null }).stage ?? null,
          } as Task;
          writeTaskToCache(fallbackTask);
        }
      } catch (error) {
        console.error("Failed to assign member", error);
      } finally {
        setIsAssigningAssignee(false);
      }
    },
    [projectMembers, setTaskAssigneeMutation, task, writeTaskToCache]
  );

  const handleClearAssignee = useCallback(() => {
    void handleAssignMember(null);
  }, [handleAssignMember]);

  const cancelDescriptionEdit = () => {
    setDescription(initialDescription);
    setIsEditingDescription(false);
  };

  const clearDueDate = useCallback(async () => {
    await handleDueDateSave(null);
  }, [handleDueDateSave]);

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      await deleteCommentMutation({ variables: { id: commentId } });
      await refetch();
      setEditingCommentId(null);
      setEditingCommentText("");
    },
    [deleteCommentMutation, refetch]
  );

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
    await updateCommentMutation({ variables: { id: editingCommentId, content: trimmed } });
    await refetch();
    setEditingCommentId(null);
    setEditingCommentText("");
  }, [editingCommentId, editingCommentText, updateCommentMutation, refetch]);

  const dialog: TaskDialogControls = {
    isOpen,
    handleClose,
    handleDialogOpenChange,
  };

  const titleControls: TitleControls = {
    value: title,
    isEditing: isEditingTitle,
    canCommit: Boolean(title.trim()),
    startEdit: () => setIsEditingTitle(true),
    change: (value: string) => setTitle(value.slice(0, TASK_TITLE_MAX_LENGTH)),
    commit: commitTitle,
    cancel: cancelTitleEdit,
  };

  const descriptionControls: DescriptionControls = {
    value: description,
    initialValue: initialDescription,
    isEditing: isEditingDescription,
    isExpanded: isDescriptionExpanded,
    toggleExpanded: () => setIsDescriptionExpanded((prev) => !prev),
    change: setDescription,
    startEdit: (reset?: boolean) => {
      if (reset) setDescription("");
      setIsEditingDescription(true);
    },
    save: commitDescription,
    cancel: cancelDescriptionEdit,
  };

  const draftControls: DraftControls = {
    suggestions: subtaskSuggestions,
    isPromptVisible: isDraftPromptVisible,
    prompt: draftPrompt,
    error: draftError,
    isGenerating: isGeneratingDraft,
    togglePrompt: toggleDraftPrompt,
    changePrompt: setDraftPrompt,
    cancelPrompt: cancelDraftPrompt,
    generateDraft: handleGenerateDraft,
  };

  const metaControls: MetaControls = {
    dueDate,
    priority,
    status,
    statusError,
    isStatusUpdating: statusUpdating,
    handleStatusChange,
    clearDueDate,
    handleDueDateSave,
  };

  const assigneeControls: AssigneeControls = {
    assignee,
    projectMembers,
    isMembersLoading,
    isAssigning: isAssigningAssignee,
    isSearchingMembers,
    handleSearchMembers,
    handleAssignMember,
    clearAssignee: handleClearAssignee,
  };

  const tagControls: TagControls = {
    tags,
    hasTags,
    removeTag: handleRemoveTag,
    openTagModal: () => openModal("tag"),
  };

  const commentControls: CommentControls = {
    comments,
    loading,
    commentText,
    changeCommentText: setCommentText,
    submitComment,
    editingCommentId,
    editingCommentText,
    changeEditingCommentText: setEditingCommentText,
    startEditComment: handleStartEditComment,
    cancelEditComment: handleCancelCommentEdit,
    submitCommentEdit: handleSubmitCommentEdit,
    deleteComment: handleDeleteComment,
  };

  const dueDateShortcuts: ModalShortcuts = {
    openDueDateModal: () => openModal("due-date"),
  };

  return {
    dialog,
    title: titleControls,
    description: descriptionControls,
    draft: draftControls,
    meta: metaControls,
    assignee: assigneeControls,
    tags: tagControls,
    comments: commentControls,
    dueDateModal: dueDateShortcuts,
    currentUserId,
    task,
  };
}
