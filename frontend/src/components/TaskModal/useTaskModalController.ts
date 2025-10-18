import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useApolloClient, useLazyQuery } from "@apollo/client";
import type { Task, AuthUser, TaskHistoryEvent } from "@shared/types";

import {
  GET_COMMENTS,
  ADD_COMMENT,
  DELETE_COMMENT,
  UPDATE_COMMENT,
  UPDATE_TASK,
  REMOVE_TAG_FROM_TASK,
  SET_TASK_ASSIGNEE,
  GENERATE_TASK_DRAFT,
  ASSIGN_TAG_TO_TASK,
  ADD_TAG,
  UPDATE_TAG,
  GET_PROJECT_MEMBERS,
  SEARCH_USERS,
  GET_WORKFLOWS,
  GET_TASKS,
  GET_TASK_HISTORY,
} from "../../graphql";
import { useModal } from "../ModalStack";
import { TASK_FRAGMENT } from "../../graphql/tasks";
import type { CommentWithUser, TaskDraftResponse, ProjectMember, TaskHistoryEntry } from "./types";
import { useProjectTags } from "../../hooks/useProjectTags";

export const TASK_TITLE_MAX_LENGTH = 512;
const HISTORY_FETCH_LIMIT = 50;

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  active: "Active",
  closed: "Closed",
};

const BACKLOG_LABEL = "Backlog";

function capitalize(word: string | null | undefined): string | null {
  if (!word) return null;
  const trimmed = word.trim();
  if (!trimmed) return null;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function hasKey<RecordType extends Record<string, unknown>>(
  value: RecordType,
  key: string
): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function formatStatusLabel(input: unknown): string | null {
  if (typeof input !== "string") {
    return null;
  }
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;
  return STATUS_LABELS[normalized] ?? capitalize(normalized);
}

function findProjectMemberById(members: ProjectMember[], id: string | null | undefined): ProjectMember | null {
  if (!id) return null;
  return members.find((member) => member.id === id) ?? null;
}

function formatStageLabel(snapshot: unknown, labelWhenNull: string): string | null {
  if (snapshot === null) {
    return labelWhenNull;
  }
  if (typeof snapshot === "string") {
    const trimmed = snapshot.trim();
    return trimmed || null;
  }
  if (snapshot && typeof snapshot === "object") {
    const record = snapshot as Record<string, unknown>;
    if (typeof record.name === "string" && record.name.trim()) {
      return record.name;
    }
    if (typeof record.title === "string" && record.title.trim()) {
      return record.title;
    }
    if (typeof record.id === "string" && record.id.trim()) {
      return record.id;
    }
  }
  return null;
}

function formatAssigneeLabel(snapshot: unknown, members: ProjectMember[]): string | null {
  if (snapshot === null) {
    return null;
  }

  let candidateId: string | null = null;

  if (typeof snapshot === "string") {
    candidateId = snapshot;
  } else if (snapshot && typeof snapshot === "object") {
    const record = snapshot as Record<string, unknown>;
    const first = typeof record.first_name === "string" ? record.first_name : "";
    const last = typeof record.last_name === "string" ? record.last_name : "";
    const username = typeof record.username === "string" ? record.username : "";
    if (first || last) {
      return `${first} ${last}`.trim();
    }
    if (username) {
      return `@${username}`;
    }
    if (typeof record.id === "string") {
      candidateId = record.id;
    }
  }

  if (candidateId) {
    const member = findProjectMemberById(members, candidateId);
    if (member) {
      const fullName = `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim();
      return fullName || `@${member.username}`;
    }
    return candidateId;
  }

  return null;
}

function buildHistoryEntry(event: TaskHistoryEvent, members: ProjectMember[]): TaskHistoryEntry {
  const payloadRecord = asRecord(event.payload);

  const actor =
    event.actor ??
    (() => {
      const member = findProjectMemberById(members, event.actor_id ?? null);
      return member
        ? {
            id: member.id,
            first_name: member.first_name,
            last_name: member.last_name,
            username: member.username,
            avatar_color: member.avatar_color ?? null,
          }
        : null;
    })();

  let message = "";
  let details: string | null = null;

  switch (event.event_type) {
    case "STATUS_CHANGED": {
      const fromLabel = formatStatusLabel(payloadRecord["from"]);
      const toLabel = formatStatusLabel(payloadRecord["to"]);
      if (fromLabel && toLabel && fromLabel !== toLabel) {
        message = `Status changed from ${fromLabel} to ${toLabel}`;
      } else if (toLabel) {
        message = `Status set to ${toLabel}`;
      } else if (fromLabel) {
        message = "Status cleared";
        details = `Previously ${fromLabel}`;
      } else {
        message = "Status updated";
      }
      break;
    }
    case "STAGE_CHANGED": {
      const fromProvided = hasKey(payloadRecord, "from");
      const toProvided = hasKey(payloadRecord, "to");
      const rawFrom = fromProvided ? payloadRecord["from"] : undefined;
      const rawTo = toProvided ? payloadRecord["to"] : undefined;

      const fromLabel = fromProvided ? formatStageLabel(rawFrom, BACKLOG_LABEL) : null;
      const toLabel = toProvided ? formatStageLabel(rawTo, BACKLOG_LABEL) : null;

      if (fromLabel && toLabel && fromLabel !== toLabel) {
        message = `Moved from ${fromLabel} to ${toLabel}`;
      } else if (toLabel) {
        message = `Moved to ${toLabel}`;
      } else if (fromLabel) {
        message = `Removed from ${fromLabel}`;
      } else {
        message = "Stage updated";
      }
      break;
    }
    case "ASSIGNEE_CHANGED": {
      const fromProvided = hasKey(payloadRecord, "from");
      const toProvided = hasKey(payloadRecord, "to");
      const fromLabel = fromProvided ? formatAssigneeLabel(payloadRecord["from"], members) : null;
      const toLabel = toProvided ? formatAssigneeLabel(payloadRecord["to"], members) : null;

      if (toProvided && payloadRecord["to"] === null) {
        message = "Unassigned";
        details = fromLabel ? `Previously ${fromLabel}` : null;
      } else if (toLabel && fromLabel && toLabel !== fromLabel) {
        message = `Assigned to ${toLabel}`;
        details = `Previously ${fromLabel}`;
      } else if (toLabel) {
        message = `Assigned to ${toLabel}`;
      } else if (fromLabel) {
        message = `Assignment updated`;
        details = `Previously ${fromLabel}`;
      } else {
        message = "Assignment updated";
      }
      break;
    }
    case "TASK_IMPORTED": {
      message = "Task history imported";
      const summary: string[] = [];
      const statusLabel = formatStatusLabel(payloadRecord["status"]);
      if (statusLabel) {
        summary.push(`Status ${statusLabel}`);
      }
      const stageLabel = formatStageLabel(payloadRecord["stage"], BACKLOG_LABEL);
      if (stageLabel) {
        summary.push(`Stage ${stageLabel}`);
      }
      const assigneeLabel = formatAssigneeLabel(payloadRecord["assignee"], members);
      if (assigneeLabel) {
        summary.push(`Assignee ${assigneeLabel}`);
      }
      details = summary.length > 0 ? summary.join(" · ") : null;
      break;
    }
    default: {
      message = "Task updated";
    }
  }

  return {
    id: event.id,
    eventType: event.event_type,
    createdAt: event.created_at,
    actor,
    actorId: event.actor_id ?? null,
    message: message || "Task updated",
    details,
    payload: event.payload ?? null,
  };
}

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
  removeTag: (tagId: string) => void;
  addExistingTag: (tagId: string) => void;
  createTag: (input: { name: string; color: string }) => Promise<void>;
  updateTag: (input: { id: string; name: string; color: string | null }) => Promise<void>;
  availableTags: { id: string; name: string; color: string | null }[];
  loadingAvailableTags: boolean;
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

interface HistoryControls {
  events: TaskHistoryEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface SaveControls {
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  save: () => Promise<void>;
  discard: () => void;
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
  history: HistoryControls;
  save: SaveControls;
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
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [assigneeState, setAssigneeState] = useState<Task["assignee"] | null>(null);

  const { data, loading, refetch } = useQuery(GET_COMMENTS, {
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

  const {
    tags: projectTags,
    loading: loadingProjectTags,
    refetch: refetchProjectTags,
  } = useProjectTags(projectId);

  const {
    data: historyData,
    loading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useQuery(GET_TASK_HISTORY, {
    variables: { task_id: task?.id, limit: HISTORY_FETCH_LIMIT },
    skip: !task?.id,
    fetchPolicy: "network-only",
  });

  const historyEvents = useMemo(() => {
    if (!task?.id) {
      return [];
    }
    const events = ((historyData?.task?.history ?? []) as TaskHistoryEvent[]) ?? [];
    return events.map((event) => buildHistoryEntry(event, projectMembers));
  }, [historyData, projectMembers, task?.id]);

  const refreshHistory = useCallback(async () => {
    if (!task?.id) {
      return;
    }
    try {
      await refetchHistory({
        task_id: task.id,
        limit: HISTORY_FETCH_LIMIT,
      });
    } catch (error) {
      console.error("Failed to refresh task history", error);
    }
  }, [refetchHistory, task?.id]);

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
  const [assignTagToTaskMutation] = useMutation(ASSIGN_TAG_TO_TASK);
  const [setTaskAssigneeMutation] = useMutation(SET_TASK_ASSIGNEE);
  const [createTagMutation] = useMutation(ADD_TAG);
  const [updateTagMutation] = useMutation(UPDATE_TAG);
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

  const applyTaskSnapshot = useCallback((snapshot: Task) => {
    const titleValue = snapshot.title || "";
    const normalizedTitle = titleValue.slice(0, TASK_TITLE_MAX_LENGTH);
    setTitle(normalizedTitle);
    setInitialTitle(normalizedTitle);

    const descriptionValue = snapshot.description ?? "";
    setDescription(descriptionValue);
    setInitialDescription(descriptionValue);

    const normalizedDueDate = snapshot.due_date ? snapshot.due_date.slice(0, 10) : "";
    setDueDate(normalizedDueDate);
    setPriority(snapshot.priority ?? null);
    setStatus(snapshot.status ?? "new");
    setAssigneeState(snapshot.assignee ?? null);

    const nextTags = Array.isArray(snapshot.tags)
      ? snapshot.tags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          color: tag.color ?? null,
        }))
      : [];
    setTags(nextTags);
  }, []);

  const applySuggestedTags = useCallback(
    (candidates: string[]) => {
      if (candidates.length === 0) {
        return;
      }

      const additions: { id: string; name: string; color: string | null }[] = [];

      for (const candidate of candidates) {
        const normalized = candidate.trim().toLowerCase();
        if (!normalized) continue;
        if (tags.some((tag) => tag.name.toLowerCase() === normalized)) continue;

        const matchingTag = projectTags.find(
          (tag) => tag.name.trim().toLowerCase() === normalized
        );

        if (matchingTag) {
          additions.push({
            id: matchingTag.id,
            name: matchingTag.name,
            color: matchingTag.color ?? null,
          });
        }
      }

      if (additions.length > 0) {
        setTags((previous) => [...previous, ...additions]);
      }
    },
    [projectTags, tags]
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

      const composedTask = {
        ...(task as Task),
        ...(nextTitle ? { title: nextTitle } : {}),
        ...(descriptionCandidate !== undefined
          ? { description: descriptionCandidate ? descriptionCandidate : null }
          : {}),
        ...(normalizedDueDate !== undefined ? { due_date: normalizedDueDate } : {}),
        ...(suggestion.priority !== undefined && normalizedPriority
          ? { priority: normalizedPriority }
          : {}),
      } as Task;

      const finalTitle = composedTask.title ?? "";
      setTitle(finalTitle.slice(0, TASK_TITLE_MAX_LENGTH));

      const finalDescription = composedTask.description ?? "";
      setDescription(finalDescription);
      setIsEditingDescription(false);

      const finalDueDate = composedTask.due_date ? composedTask.due_date.slice(0, 10) : "";
      setDueDate(finalDueDate);
      setPriority(composedTask.priority ?? null);
      setStatus(composedTask.status ?? "new");

      const tagCandidates = Array.isArray(suggestion.tags)
        ? suggestion.tags.map((tag) => tag.trim()).filter(Boolean)
        : [];
      const existingTagNames = new Set(tags.map((tag) => tag.name.toLowerCase()));
      const uniqueCandidates = Array.from(new Set(tagCandidates.map((tag) => tag)))
        .map((candidate) => candidate.trim())
        .filter((candidate) => candidate && !existingTagNames.has(candidate.toLowerCase()));

      applySuggestedTags(uniqueCandidates);
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
  ]);

  useEffect(() => {
    if (task) {
      applyTaskSnapshot(task);
      setIsDescriptionExpanded(false);
      setEditingCommentId(null);
      setEditingCommentText("");
      setCommentText("");
      setIsEditingDescription(false);
      setSubtaskSuggestions([]);
      setDraftPrompt("");
      setDraftError(null);
      setIsDraftPromptVisible(false);
      setStatusError(null);
      setIsSaving(false);
    }
  }, [task, applyTaskSnapshot]);

  const originalDueDate = task?.due_date ? task.due_date.slice(0, 10) : "";
  const originalPriority = task?.priority ?? null;
  const originalStatus = task?.status ?? "new";
  const originalAssigneeId = task?.assignee?.id ?? null;

  const originalTagIdsSorted = useMemo(
    () => (task?.tags ?? []).map((tag) => tag.id).sort(),
    [task?.tags]
  );
  const stagedTagIdsSorted = useMemo(
    () => tags.map((tag) => tag.id).sort(),
    [tags]
  );

  const hasUnsavedChanges = useMemo(() => {
    if (!task) return false;
    const trimmedTitle = title.trim();
    const trimmedInitialTitle = initialTitle.trim();
    if (trimmedTitle !== trimmedInitialTitle) return true;
    if (description.trim() !== initialDescription.trim()) return true;
    if ((dueDate || "") !== originalDueDate) return true;
    if ((priority ?? null) !== originalPriority) return true;
    if (status !== originalStatus) return true;
    if ((assigneeState?.id ?? null) !== originalAssigneeId) return true;
    if (stagedTagIdsSorted.length !== originalTagIdsSorted.length) return true;
    for (let index = 0; index < stagedTagIdsSorted.length; index += 1) {
      if (stagedTagIdsSorted[index] !== originalTagIdsSorted[index]) {
        return true;
      }
    }
    return false;
  }, [
    task,
    title,
    initialTitle,
    description,
    initialDescription,
    dueDate,
    originalDueDate,
    priority,
    originalPriority,
    status,
    originalStatus,
    assigneeState,
    originalAssigneeId,
    stagedTagIdsSorted,
    originalTagIdsSorted,
  ]);

  const discardChanges = useCallback(() => {
    if (!task) return;
    applyTaskSnapshot(task);
    setIsDescriptionExpanded(false);
    setStatusError(null);
    setSubtaskSuggestions([]);
    setDraftPrompt("");
    setDraftError(null);
    setIsDraftPromptVisible(false);
  }, [task, applyTaskSnapshot]);

  const saveTaskChanges = useCallback(async () => {
    if (!task) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setStatusError("Title is required.");
      return;
    }

    const normalizedDescription = description.trim();
    const payload: Partial<
      Pick<Task, "title" | "description" | "due_date" | "priority" | "status">
    > = {};

    if (trimmedTitle !== initialTitle.trim()) {
      payload.title = trimmedTitle;
    }
    if (normalizedDescription !== initialDescription.trim()) {
      payload.description = normalizedDescription;
    }
    if ((dueDate || "") !== originalDueDate) {
      payload.due_date = dueDate || null;
    }
    if ((priority ?? null) !== originalPriority) {
      payload.priority = priority ?? null;
    }
    if (status !== originalStatus) {
      payload.status = status ?? "new";
    }

    const originalTags = task.tags ?? [];
    const originalTagIdSet = new Set(originalTags.map((tag) => tag.id));
    const stagedTagIdSet = new Set(tags.map((tag) => tag.id));
    const tagsToAdd = tags
      .map((tag) => tag.id)
      .filter((id) => !originalTagIdSet.has(id));
    const tagsToRemove = originalTags
      .map((tag) => tag.id)
      .filter((id) => !stagedTagIdSet.has(id));

    const nextAssigneeId = assigneeState?.id ?? null;

    if (
      Object.keys(payload).length === 0 &&
      tagsToAdd.length === 0 &&
      tagsToRemove.length === 0 &&
      nextAssigneeId === originalAssigneeId
    ) {
      setStatusError(null);
      return;
    }

    setIsSaving(true);
    try {
      let updatedTask: Task | null = task;
      let didMutate = false;

      if (Object.keys(payload).length > 0) {
        const { data } = await updateTask({
          variables: {
            id: task.id,
            ...payload,
          },
        });
        if (data?.updateTask) {
          updatedTask = data.updateTask as Task;
          writeTaskToCache(updatedTask);
          didMutate = true;
        }
      }

      if (nextAssigneeId !== originalAssigneeId) {
        const { data } = await setTaskAssigneeMutation({
          variables: { task_id: task.id, member_id: nextAssigneeId },
          refetchQueries:
            task.project_id != null
              ? [
                  { query: GET_WORKFLOWS, variables: { project_id: task.project_id } },
                  { query: GET_TASKS, variables: {} },
                  { query: GET_TASKS, variables: { project_id: task.project_id } },
                ]
              : undefined,
        });
        if (data?.setTaskAssignee) {
          updatedTask = data.setTaskAssignee as Task;
          writeTaskToCache(updatedTask);
        } else if (updatedTask) {
          updatedTask = {
            ...updatedTask,
            assignee_id: nextAssigneeId,
            assignee: assigneeState ?? null,
          } as Task;
          writeTaskToCache(updatedTask);
        }
        didMutate = true;
      }

      for (const tagId of tagsToAdd) {
        const { data } = await assignTagToTaskMutation({
          variables: { task_id: task.id, tag_id: tagId },
        });
        if (data?.assignTagToTask) {
          updatedTask = data.assignTagToTask as Task;
          writeTaskToCache(updatedTask);
        }
        didMutate = true;
      }

      for (const tagId of tagsToRemove) {
        const { data } = await removeTagFromTask({
          variables: { task_id: task.id, tag_id: tagId },
        });
        if (data?.removeTagFromTask) {
          updatedTask = data.removeTagFromTask as Task;
          writeTaskToCache(updatedTask);
        }
        didMutate = true;
      }

      if (updatedTask) {
        applyTaskSnapshot(updatedTask);
        setIsDescriptionExpanded(false);
        setStatusError(null);
      }

      if (didMutate) {
        await refreshHistory();
      }
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Unable to save task changes.");
    } finally {
      setIsSaving(false);
    }
  }, [
    task,
    title,
    initialTitle,
    description,
    initialDescription,
    dueDate,
    originalDueDate,
    priority,
    originalPriority,
    status,
    originalStatus,
    assigneeState,
    originalAssigneeId,
    tags,
    updateTask,
    setTaskAssigneeMutation,
    assignTagToTaskMutation,
    removeTagFromTask,
    writeTaskToCache,
    applyTaskSnapshot,
    refreshHistory,
  ]);

  const handleClose = useCallback(async () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm("Discard unsaved changes?");
      if (!confirmed) {
        return;
      }
      discardChanges();
    }
    closeModal("task");
  }, [hasUnsavedChanges, discardChanges, closeModal]);

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
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(initialTitle);
    } else {
      setTitle(trimmed.slice(0, TASK_TITLE_MAX_LENGTH));
    }
    setIsEditingTitle(false);
  }, [title, initialTitle]);

  const commitDescription = useCallback(async () => {
    setDescription(description.trim());
    setIsEditingDescription(false);
  }, [description]);

  const handleDueDateSave = useCallback(
    async (nextDate: string | null) => {
      const normalized = nextDate?.trim() ? nextDate.trim().slice(0, 10) : "";
      if (normalized === dueDate) {
        return;
      }
      setDueDate(normalized);
    },
    [dueDate]
  );

  const handleStatusChange = useCallback(
    async (nextStatus: Task["status"]) => {
      if (nextStatus === status) return;
      setStatusError(null);
      setStatus(nextStatus);
    },
    [status]
  );

  const submitComment = useCallback(async () => {
    if (!task) return;
    const trimmed = commentText.trim();
    if (!trimmed) return;
    await addComment({ variables: { task_id: task.id, content: trimmed } });
    await refetch();
    setCommentText("");
  }, [task, commentText, addComment, refetch]);

  const assignee = assigneeState;
  const comments = (data?.task?.comments ?? []) as CommentWithUser[];

  const handleRemoveTag = useCallback((tagId: string) => {
    setTags((previous) => previous.filter((tag) => tag.id !== tagId));
  }, []);

  const handleAddExistingTag = useCallback(
    (tagId: string) => {
      if (tags.some((tag) => tag.id === tagId)) {
        return;
      }
      const matchingTag = projectTags.find((tag) => tag.id === tagId);
      if (!matchingTag) {
        return;
      }
      setTags((previous) => [
        ...previous,
        {
          id: matchingTag.id,
          name: matchingTag.name,
          color: matchingTag.color ?? null,
        },
      ]);
    },
    [projectTags, tags]
  );

  const handleCreateTag = useCallback(
    async ({ name, color }: { name: string; color: string }) => {
      if (!projectId) return;
      const trimmed = name.trim();
      const trimmedColor = color.trim();
      const colorVariable = trimmedColor || undefined;
      if (!trimmed) return;

      try {
        const { data } = await createTagMutation({
          variables: { project_id: projectId, name: trimmed, color: colorVariable },
        });

        await refetchProjectTags().catch(() => undefined);

        const createdTag = data?.addTag;
        if (createdTag) {
          setTags((previous) => {
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
        console.error("Failed to create tag", error);
      }
    },
    [createTagMutation, projectId, refetchProjectTags]
  );

  const handleUpdateTag = useCallback(
    async ({ id, name, color }: { id: string; name: string; color: string | null }) => {
      if (!projectId) return;
      const targetTag = projectTags.find((candidate) => candidate.id === id);

      const providedName = name.trim();
      const resolvedName = providedName || targetTag?.name?.trim();
      if (!resolvedName) {
        return;
      }

      const sanitizedColor = color?.trim() ?? "";

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

        setTags((previous) =>
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
        console.error("Failed to update tag", error);
      }
    },
    [projectId, projectTags, updateTagMutation, refetchProjectTags]
  );

  const handleAssignMember = useCallback(
    async (memberId: string | null) => {
      if (memberId === assigneeState?.id) {
        return;
      }

      if (!memberId) {
        setAssigneeState(null);
        return;
      }

      const member = projectMembers.find((candidate) => candidate.id === memberId);
      if (member) {
        setAssigneeState({
          id: member.id,
          first_name: member.first_name,
          last_name: member.last_name,
          username: member.username,
          avatar_color: member.avatar_color,
        });
      } else {
        setAssigneeState(null);
      }
    },
    [assigneeState?.id, projectMembers]
  );

  const handleClearAssignee = useCallback(() => {
    setAssigneeState(null);
  }, []);

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
    isStatusUpdating: isSaving,
    handleStatusChange,
    clearDueDate,
    handleDueDateSave,
  };

  const assigneeControls: AssigneeControls = {
    assignee,
    projectMembers,
    isMembersLoading,
    isAssigning: isSaving,
    isSearchingMembers,
    handleSearchMembers,
    handleAssignMember,
    clearAssignee: handleClearAssignee,
  };

  const tagControls: TagControls = {
    tags,
    removeTag: handleRemoveTag,
    addExistingTag: handleAddExistingTag,
    createTag: handleCreateTag,
    updateTag: handleUpdateTag,
    availableTags: projectTags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color ?? null,
    })),
    loadingAvailableTags: loadingProjectTags,
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

  const historyControls: HistoryControls = {
    events: historyEvents,
    loading: historyLoading,
    error: historyError?.message ?? null,
    refetch: refreshHistory,
  };

  const saveControls = {
    hasUnsavedChanges,
    isSaving,
    save: saveTaskChanges,
    discard: discardChanges,
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
    history: historyControls,
    save: saveControls,
    dueDateModal: dueDateShortcuts,
    currentUserId,
    task,
  };
}
