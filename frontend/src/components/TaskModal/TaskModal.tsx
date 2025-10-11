import { useState, useEffect, Fragment, useCallback } from "react";
import { useQuery, useMutation, useApolloClient } from "@apollo/client";
import type { Task, AuthUser } from "@shared/types";
import {
  GET_COMMENTS,
  ADD_COMMENT,
  DELETE_COMMENT,
  UPDATE_COMMENT,
  UPDATE_TASK,
  GET_TASK_TAGS,
  REMOVE_TAG_FROM_TASK,
  SET_TASK_MEMBERS,
  GENERATE_TASK_DRAFT,
  ADD_TAG_TO_TASK,
} from "../../graphql";
import { Sparkles, X } from "lucide-react";
import { useModal } from "../ModalStack";
import { DueDateModal } from "../DueDateModal";
import { TaskTitleEditor } from "./TaskTitleEditor";
import { TaskMetaSection } from "./TaskMetaSection";
import { TaskDescriptionSection } from "./TaskDescriptionSection";
import { TaskCommentsPanel } from "./TaskCommentsPanel";
import type { CommentWithUser, TaskDraftResponse } from "./types";
import { TASK_FRAGMENT } from '../../graphql/tasks';
import { Button, Dialog, DialogContent, ScrollArea, Separator } from "../ui";
import { cn } from "../../lib/utils";

const TASK_TITLE_MAX_LENGTH = 512;

const TAG_COLOR_PALETTE = [
  "#38BDF8",
  "#22D3EE",
  "#34D399",
  "#FBBF24",
  "#F472B6",
  "#A855F7",
  "#60A5FA",
];

function getColorForTagByIndex(index: number): string {
  return TAG_COLOR_PALETTE[index % TAG_COLOR_PALETTE.length];
}

interface TaskModalProps {
  task: Task | null;
  currentUser: AuthUser | null;
  onTaskUpdate?: (task: Task) => void;
}

export function TaskModal({ task, currentUser, onTaskUpdate }: TaskModalProps) {
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
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [tags, setTags] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [subtaskSuggestions, setSubtaskSuggestions] = useState<string[]>([]);
  const [isDraftPromptVisible, setIsDraftPromptVisible] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const { data, loading, refetch } = useQuery(GET_COMMENTS, {
    variables: { task_id: task?.id },
    skip: !task,
  });

  const { data: tagsData } = useQuery(GET_TASK_TAGS, {
    variables: { task_id: task?.id },
    skip: !task,
  });

  const [addComment] = useMutation(ADD_COMMENT);
  const [deleteCommentMutation] = useMutation(DELETE_COMMENT);
  const [updateCommentMutation] = useMutation(UPDATE_COMMENT);

  const [updateTask] = useMutation(UPDATE_TASK);
  const [removeTagFromTask] = useMutation(REMOVE_TAG_FROM_TASK);
  const [updateTaskMembers] = useMutation(SET_TASK_MEMBERS);
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
      if (!(next as unknown as { stage?: Task["stage"] | null }).stage) {
        const existing = client.cache.readFragment<Task & { stage?: Task["stage"] | null } | null>({
          id: cacheId,
          fragment: TASK_FRAGMENT,
        });
        if (existing?.stage) {
          data = { ...next, stage: existing.stage } as Task & { stage?: Task["stage"] | null };
        }
      }

      client.cache.writeFragment({
        id: cacheId,
        fragment: TASK_FRAGMENT,
        data: {
          ...data,
          __typename: "Task",
        },
      });
      onTaskUpdate?.(data);
    },
    [client, onTaskUpdate]
  );

  const mutateTask = useCallback(
    async (variables: Partial<Pick<Task, "title" | "description" | "due_date" | "priority" | "stage_id">>) => {
      if (!task) return null;
      const { data: mutationData } = await updateTask({
        variables: {
          id: task.id,
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
      setEditingCommentId(null);
      setEditingCommentText("");
      setCommentText("");
      setIsEditingDescription(false);
      setSubtaskSuggestions([]);
      setDraftPrompt("");
      setDraftError(null);
      setIsDraftPromptVisible(false);
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

    const payload: Partial<Pick<Task, "title" | "description" | "due_date" | "priority">> = {};
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

    if (priority !== task.priority) {
      payload.priority = priority ?? null;
      shouldMutate = true;
    }

    if (!shouldMutate) {
      return;
    }

    const updated = await mutateTask(payload);

    if (updated) {
      const nextTitle = updated.title ?? "";
      setTitle(nextTitle.slice(0, TASK_TITLE_MAX_LENGTH));
      setInitialTitle(nextTitle.slice(0, TASK_TITLE_MAX_LENGTH));

      const nextDescription = updated.description ?? "";
      setDescription(nextDescription);
      setInitialDescription(nextDescription);
      setIsEditingDescription(false);

      const nextDue = updated.due_date ? updated.due_date.slice(0, 10) : "";
      setDueDate(nextDue);
      setPriority(updated.priority ?? null);
    }
  }, [task, title, initialTitle, description, initialDescription, dueDate, priority, mutateTask]);

  const handleClose = useCallback(async () => {
    await saveAllChanges();
    closeModal("task");
  }, [saveAllChanges, closeModal]);

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        void handleClose();
      }
    },
    [handleClose]
  );

  if (!isOpen || !task) return null;

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
      }
    }
    setIsEditingTitle(false);
  }, [task, title, initialTitle, mutateTask]);

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
    }
    setIsEditingDescription(false);
  }, [task, description, initialDescription, mutateTask]);

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
    [task, dueDate, mutateTask, writeTaskToCache]
  );

  const submitComment = async () => {
    if (!task) return;
    const trimmed = commentText.trim();
    if (!trimmed) return;
    await addComment({ variables: { task_id: task.id, content: trimmed } });
    await refetch();
    setCommentText("");
  };

  const assignees = task.assignees ?? [];
  const hasTags = tags.length > 0;
  const hasAssignees = assignees.length > 0;
  const comments = (data?.task?.comments ?? []) as CommentWithUser[];

  const handleRemoveTag = async (tagId: string) => {
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
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!task) return;
    const remaining = assignees.filter((member) => member.id !== memberId);
    await updateTaskMembers({
      variables: { task_id: task.id, member_ids: remaining.map((m) => m.id) },
    });
    const nextTask = {
      ...task,
      assignees: remaining,
      stage: (task as unknown as { stage?: Task["stage"] | null }).stage ?? null,
    } as Task;
    writeTaskToCache(nextTask);
  };

  const cancelDescriptionEdit = () => {
    setDescription(initialDescription);
    setIsEditingDescription(false);
  };

  const clearDueDate = async () => {
    await handleDueDateSave(null);
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteCommentMutation({ variables: { id: commentId } });
    await refetch();
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleStartEditComment = (commentId: string, content: string | null) => {
    setEditingCommentId(commentId);
    setEditingCommentText((content ?? ""));
  };

  const handleCancelCommentEdit = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleSubmitCommentEdit = async () => {
    if (!editingCommentId) return;
    const trimmed = editingCommentText.trim();
    if (!trimmed) return;
    await updateCommentMutation({ variables: { id: editingCommentId, content: trimmed } });
    await refetch();
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  return (
    <Fragment>
      <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="task-modal-theme max-w-[1100px] overflow-hidden border border-border bg-[hsl(var(--modal-background))] p-0 text-[hsl(var(--modal-foreground))] shadow-2xl"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="flex h-[80vh] min-h-[560px] flex-col bg-[hsl(var(--background))]">
            <div className="flex items-start justify-between gap-4 border-b border-border/60 bg-[hsl(var(--background))] px-6 py-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Task details
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => void handleClose()}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid flex-1 gap-0 bg-[hsl(var(--background))] md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <ScrollArea className="h-full min-h-0 border-b border-border/60 bg-[hsl(var(--background))] md:border-b-0 md:border-r">
                <div className="flex flex-col gap-4 px-6 py-5">
                  <TaskTitleEditor
                    title={title}
                    isEditing={isEditingTitle}
                    canCommit={Boolean(title.trim())}
                    maxLength={TASK_TITLE_MAX_LENGTH}
                    onStartEdit={() => setIsEditingTitle(true)}
                    onChange={(value) => setTitle(value.slice(0, TASK_TITLE_MAX_LENGTH))}
                    onCommit={commitTitle}
                    onCancel={cancelTitleEdit}
                  />

                  <TaskMetaSection
                    hasTags={hasTags}
                    hasAssignees={hasAssignees}
                    tags={tags}
                    assignees={assignees}
                    dueDate={dueDate}
                    onAddTag={() => openModal("tag")}
                    onAddMember={() => openModal("member")}
                    onAddDueDate={() => openModal("due-date")}
                    onRemoveTag={handleRemoveTag}
                    onRemoveMember={handleRemoveMember}
                    onClearDueDate={clearDueDate}
                  />

                  <Separator />

                  <TaskDescriptionSection
                    description={description}
                    initialDescription={initialDescription}
                    isEditing={isEditingDescription}
                    onChange={setDescription}
                    onStartEdit={(reset) => {
                      if (reset) setDescription("");
                      setIsEditingDescription(true);
                    }}
                    onSave={commitDescription}
                    onCancel={cancelDescriptionEdit}
                    isDraftPromptVisible={isDraftPromptVisible}
                    draftPrompt={draftPrompt}
                    draftError={draftError}
                    isGeneratingDraft={isGeneratingDraft}
                    onToggleDraftPrompt={toggleDraftPrompt}
                    onDraftPromptChange={setDraftPrompt}
                    onGenerateDraft={() => void handleGenerateDraft()}
                    onCancelDraftPrompt={cancelDraftPrompt}
                    isExpanded={isDescriptionExpanded}
                    onToggleExpand={() => setIsDescriptionExpanded((prev) => !prev)}
                  />

                  {subtaskSuggestions.length > 0 ? (
                    <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                        <Sparkles className="h-4 w-4" />
                        <span>AI suggested subtasks</span>
                      </div>
                      <ul className="list-outside space-y-1 pl-4 text-muted-foreground">
                        {subtaskSuggestions.map((suggestion) => (
                          <li key={suggestion} className="list-disc">
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-muted-foreground/80">
                        Add the ones you like as separate tasks or checklist items.
                      </p>
                    </div>
                  ) : null}
                </div>
              </ScrollArea>

              <ScrollArea className="h-full min-h-0 bg-[hsl(var(--background))]">
                <div className="flex h-full flex-col px-6 py-5">
                  <TaskCommentsPanel
                    comments={comments}
                    loading={loading}
                    commentText={commentText}
                    onCommentTextChange={setCommentText}
                    onSubmitComment={submitComment}
                    editingCommentId={editingCommentId}
                    editingCommentText={editingCommentText}
                    onEditCommentTextChange={setEditingCommentText}
                    onStartEditComment={handleStartEditComment}
                    onCancelEditComment={handleCancelCommentEdit}
                    onSubmitEditComment={handleSubmitCommentEdit}
                    onDeleteComment={handleDeleteComment}
                    currentUserId={currentUserId}
                  />
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <DueDateModal task={task} currentDueDate={dueDate} onSave={handleDueDateSave} />
    </Fragment>
  );
}
