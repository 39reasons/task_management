import {
  useState,
  useEffect,
  Fragment,
  useCallback,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useQuery, useMutation, useApolloClient, gql } from "@apollo/client";
import type { Task, AuthUser, Comment } from "@shared/types";
import {
  GET_COMMENTS,
  ADD_COMMENT,
  DELETE_COMMENT,
  UPDATE_COMMENT,
  UPDATE_TASK,
  GET_TASK_TAGS,
  REMOVE_TAG_FROM_TASK,
  SET_TASK_MEMBERS,
} from "../../graphql";
import {
  Plus,
  Dot,
  X,
  Edit3,
  AlignLeft,
  Trash2,
  Clock,
  Calendar,
  CornerDownLeft,
} from "lucide-react";
import { useModal } from "../ModalStack";
import { DueDateModal } from "../DueDateModal";
import { getFullName, getInitials } from "../../utils/user";
import { DEFAULT_AVATAR_COLOR } from "../../constants/colors";

function timeAgo(timestamp: number) {
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo ago`;
  return `${Math.floor(diff / 31536000)}y ago`;
}

type CommentWithUser = Comment & {
  user?: AuthUser | null;
  created_at: string;
  updated_at?: string | null;
};

const TASK_TITLE_MAX_LENGTH = 512;

const TASK_FRAGMENT = gql`
  fragment TaskModalTaskFields on Task {
    id
    title
    description
    due_date
    priority
    stage_id
    project_id
    position
    assignees {
      id
      first_name
      last_name
      username
      avatar_color
      __typename
    }
    stage {
      id
      name
      position
      workflow_id
      __typename
    }
    tags {
      id
      name
      color
      __typename
    }
    __typename
  }
`;

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
  const [tags, setTags] = useState<{ id: string; name: string; color: string }[]>([]);

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

  useEffect(() => {
    if (task) {
      const titleValue = task.title || "";
      setTitle(titleValue.slice(0, TASK_TITLE_MAX_LENGTH));
      setInitialTitle(titleValue.slice(0, TASK_TITLE_MAX_LENGTH));
      setDescription(task.description ?? "");
      setInitialDescription(task.description ?? "");
      const normalizedDueDate = task.due_date ? task.due_date.slice(0, 10) : "";
      setDueDate(normalizedDueDate);
      setPriority(task.priority ?? null);
      setEditingCommentId(null);
      setEditingCommentText("");
      setCommentText("");
      setIsEditingDescription(false);
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
      payload.description = normalizedDescription ? normalizedDescription : null;
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

  useEffect(() => {
    const handler = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        event.stopPropagation();
        void (async () => {
          await saveAllChanges();
          closeModal("task");
        })();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, saveAllChanges, closeModal]);

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
      setDescription(initialDescription);
      return;
    }

    const payload = trimmed ? trimmed : null;
    const updated = await mutateTask({ description: payload });
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

      const updated = await mutateTask({ due_date: normalized });
      if (updated) {
        const nextDue = updated.due_date ? updated.due_date.slice(0, 10) : "";
        setDueDate(nextDue);
      }
    },
    [task, dueDate, mutateTask]
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
      <div className="fixed inset-0 z-40 flex items-start justify-center pt-16">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => {
            void (async () => {
              await saveAllChanges();
              closeModal("task");
            })();
          }}
        />

        <div
          id="task-modal-root"
          className="
            relative bg-gray-800 rounded-xl shadow-lg w-full max-w-4xl
            max-h-[80vh] overflow-hidden
            grid grid-cols-1 md:grid-cols-2 gap-6 p-6
          "
        >
          <div className="flex flex-col min-h-0 pr-2">
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

            <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
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
              />
            </div>
          </div>

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
      </div>
      <DueDateModal task={task} currentDueDate={dueDate} onSave={handleDueDateSave} />
    </Fragment>
  );
}

interface TaskTitleEditorProps {
  title: string;
  isEditing: boolean;
  canCommit: boolean;
  maxLength: number;
  onStartEdit: () => void;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

function TaskTitleEditor({
  title,
  isEditing,
  canCommit,
  maxLength,
  onStartEdit,
  onChange,
  onCommit,
  onCancel,
}: TaskTitleEditorProps) {
  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={onStartEdit}
        className="w-full rounded-xl border border-transparent px-4 py-2 text-left text-xl font-bold leading-tight text-white transition hover:border-gray-600 hover:bg-gray-900/70 break-all"
      >
        {title}
      </button>
    );
  }

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onCommit();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-gray-600/60 bg-gray-900/80 px-4 py-2 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30">
      <input
        type="text"
        value={title}
        autoFocus
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={handleKeyDown}
        className="flex-1 bg-transparent text-xl font-bold leading-tight text-white focus:outline-none"
        maxLength={maxLength}
      />
      <button
        type="button"
        onClick={onCommit}
        disabled={!canCommit}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
          canCommit
            ? "text-blue-300 hover:bg-blue-500/10 border-transparent"
            : "border-transparent text-gray-500"
        }`}
        aria-label="Save title"
      >
        <CornerDownLeft size={16} />
      </button>
    </div>
  );
}

interface TaskMetaSectionProps {
  hasTags: boolean;
  hasAssignees: boolean;
  tags: { id: string; name: string; color: string }[];
  assignees: AuthUser[];
  dueDate: string;
  onAddTag: () => void;
  onAddMember: () => void;
  onAddDueDate: () => void;
  onRemoveTag: (id: string) => void;
  onRemoveMember: (id: string) => void;
  onClearDueDate: () => void;
}

function TaskMetaSection({
  hasTags,
  hasAssignees,
  tags,
  assignees,
  dueDate,
  onAddTag,
  onAddMember,
  onAddDueDate,
  onRemoveTag,
  onRemoveMember,
  onClearDueDate,
}: TaskMetaSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {!hasTags && (
          <button
            type="button"
            onClick={onAddTag}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-600 bg-gray-900 text-sm text-white hover:border-gray-400"
          >
            <Plus size={14} />
            Tags
          </button>
        )}
        {!hasAssignees && (
          <button
            type="button"
            onClick={onAddMember}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-600 bg-gray-900 text-sm text-white hover:border-gray-400"
          >
            <Plus size={14} />
            Members
          </button>
        )}
        {!dueDate && (
          <button
            type="button"
            onClick={onAddDueDate}
            className="flex items-center gap-1 rounded-md border border-gray-600 bg-gray-900 px-3 py-1.5 text-sm text-white hover:border-gray-400"
          >
            <Clock size={14} />
            Due date
          </button>
        )}
      </div>

      {hasTags && (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-400">Tags</p>
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 rounded-full bg-gray-700/80 px-3 py-1.5 text-xs text-white"
                style={{ backgroundColor: tag.color ?? undefined }}
              >
                <span className="font-semibold uppercase tracking-wide">
                  {tag.name}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveTag(tag.id)}
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/50 text-white/80 transition hover:border-red-300 hover:text-red-100"
                  aria-label={`Remove ${tag.name}`}
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={onAddTag}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-gray-500 text-gray-200 transition hover:border-blue-400 hover:text-blue-200"
              aria-label="Add tag"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      )}

      {hasAssignees && (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-400">Assignees</p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-white">
            {assignees.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 rounded-full bg-gray-700/70 px-3 py-1.5 text-xs text-white"
              >
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold uppercase text-white"
                  style={{ backgroundColor: member.avatar_color || DEFAULT_AVATAR_COLOR }}
                >
                  {getInitials(member)}
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="font-semibold">{getFullName(member)}</span>
                  <span className="text-[10px] text-gray-300">@{member.username}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveMember(member.id)}
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full border border-gray-500 text-gray-300 transition hover:border-red-400 hover:text-red-300"
                  aria-label={`Remove ${getFullName(member)}`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={onAddMember}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-gray-500 text-gray-200 transition hover:border-blue-400 hover:text-blue-200"
              aria-label="Add member"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      )}

      {dueDate ? (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-400">Due Date</p>
          <div className="relative inline-flex items-center rounded-full border border-gray-600/70 bg-gray-800/70 pr-6 text-xs text-white">
            <button
              type="button"
              onClick={onAddDueDate}
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-left text-white transition hover:bg-gray-700/70"
            >
              <Calendar size={14} className="text-gray-300" />
              <span>{dueDate}</span>
            </button>
            <button
              type="button"
              onClick={onClearDueDate}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-gray-500 bg-gray-900 text-gray-300 transition hover:border-red-400 hover:text-red-200"
              aria-label="Remove due date"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface TaskDescriptionSectionProps {
  description: string;
  initialDescription: string;
  isEditing: boolean;
  onChange: (value: string) => void;
  onStartEdit: (reset?: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
}

function TaskDescriptionSection({
  description,
  initialDescription,
  isEditing,
  onChange,
  onStartEdit,
  onSave,
  onCancel,
}: TaskDescriptionSectionProps) {
  const trimmedCurrent = description.trim();
  const trimmedInitial = initialDescription.trim();
  const hasContent = Boolean(trimmedInitial);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <AlignLeft className="h-4 w-4 text-gray-400" />
        <span>Description</span>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={description}
            autoFocus
            onChange={(e) => onChange(e.target.value)}
            placeholder="Add a more detailed description..."
            className="min-h-[140px] w-full resize-vertical rounded-xl border border-gray-600 bg-gray-900/80 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSave}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
              disabled={trimmedCurrent === trimmedInitial}
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-800 hover:text-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : hasContent ? (
        <button
          type="button"
          onClick={() => onStartEdit(false)}
          className="w-full rounded-xl border border-gray-600 bg-gray-900/60 px-4 py-3 text-left text-sm text-gray-200 transition hover:border-blue-500 hover:text-blue-200 whitespace-pre-wrap"
        >
          {initialDescription}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onStartEdit(true)}
          className="w-full rounded-xl border border-dashed border-gray-600 px-4 py-6 text-sm text-left text-gray-400 hover:border-blue-500 hover:text-blue-300"
        >
          Add a more detailed description...
        </button>
      )}
    </div>
  );
}

interface TaskCommentsPanelProps {
  comments: CommentWithUser[];
  loading: boolean;
  commentText: string;
  onCommentTextChange: (value: string) => void;
  onSubmitComment: () => Promise<void>;
  editingCommentId: string | null;
  editingCommentText: string;
  onEditCommentTextChange: (value: string) => void;
  onStartEditComment: (id: string, content: string | null) => void;
  onCancelEditComment: () => void;
  onSubmitEditComment: () => Promise<void>;
  onDeleteComment: (id: string) => Promise<void>;
  currentUserId: string | null;
}

function TaskCommentsPanel({
  comments,
  loading,
  commentText,
  onCommentTextChange,
  onSubmitComment,
  editingCommentId,
  editingCommentText,
  onEditCommentTextChange,
  onStartEditComment,
  onCancelEditComment,
  onSubmitEditComment,
  onDeleteComment,
  currentUserId,
}: TaskCommentsPanelProps) {
  const trimmedComment = commentText.trim();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmitComment();
  };

  return (
    <div className="flex flex-col pl-2 border-l border-gray-700/60">
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex items-center gap-3 rounded-xl border border-gray-600/60 bg-gray-900/80 px-4 py-2 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30">
          <input
            type="text"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-400 focus:outline-none"
            placeholder="Write a comment..."
            value={commentText}
            onChange={(e) => onCommentTextChange(e.target.value)}
          />
          <button
            type="submit"
            disabled={!trimmedComment}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
              trimmedComment
                ? "text-blue-300 hover:bg-blue-500/10 border-transparent"
                : "border-transparent text-gray-500"
            }`}
            aria-label="Submit comment"
          >
            <CornerDownLeft size={16} />
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500">No comments yet.</p>
      ) : (
        <Fragment>
          <div className="mb-2 text-sm font-semibold text-white">Comments</div>
          <div className="overflow-y-auto min-h-0 pr-2 space-y-2 max-h-[calc(80vh-10rem)]">
            {comments.map((comment) => {
              const isOwn = currentUserId === comment.user?.id;
              const isEditing = editingCommentId === comment.id;
              const trimmedContent = (comment.content ?? "").trim();
              const isEdited = comment.updated_at && comment.updated_at !== comment.created_at;

              return (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  isOwn={isOwn}
                  isEditing={isEditing}
                  editingText={isEditing ? editingCommentText : ""}
                  onChangeEditingText={onEditCommentTextChange}
                  onStartEdit={() => onStartEditComment(comment.id, comment.content ?? "")}
                  onCancelEdit={onCancelEditComment}
                  onSubmitEdit={onSubmitEditComment}
                  onDelete={() => onDeleteComment(comment.id)}
                  trimmedOriginal={trimmedContent}
                  isEdited={Boolean(isEdited)}
                />
              );
            })}
          </div>
        </Fragment>
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: CommentWithUser;
  isOwn: boolean;
  isEditing: boolean;
  editingText: string;
  onChangeEditingText: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSubmitEdit: () => Promise<void>;
  onDelete: () => Promise<void>;
  trimmedOriginal: string;
  isEdited: boolean;
}

function CommentItem({
  comment,
  isOwn,
  isEditing,
  editingText,
  onChangeEditingText,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onDelete,
  trimmedOriginal,
  isEdited,
}: CommentItemProps) {
  const handleSave = async () => {
    if (!editingText.trim() || editingText.trim() === trimmedOriginal) {
      return;
    }
    await onSubmitEdit();
  };

  return (
    <div
      className={`group relative flex gap-3 rounded-xl border border-gray-700/60 bg-gray-900/70 p-3 shadow-sm transition ${
        isEditing ? "border-blue-500/80 bg-gray-900/80" : "hover:border-blue-500/70 hover:bg-gray-900/80"
      }`}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase text-white"
        style={{ backgroundColor: comment.user?.avatar_color || DEFAULT_AVATAR_COLOR }}
      >
        {comment.user ? getInitials(comment.user) : "?"}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
          <span className="font-semibold text-white">
            {comment.user ? getFullName(comment.user) : "Unknown"}
          </span>
          {comment.user?.username && (
            <span className="text-gray-500">@{comment.user.username}</span>
          )}
          <Dot size={14} className="text-gray-600" />
          <span>{timeAgo(Number(comment.created_at))}</span>
          {isEdited && <span className="text-gray-500">(edited)</span>}
        </div>

        {isOwn && !isEditing && (
          <div className="absolute right-3 top-3 hidden items-center gap-2 group-hover:flex">
            <button
              type="button"
              onClick={onStartEdit}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-600/70 bg-gray-900/70 text-gray-300 transition hover:border-blue-400 hover:text-blue-200"
              aria-label="Edit comment"
            >
              <Edit3 size={14} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-600/70 bg-gray-900/70 text-gray-300 transition hover:border-red-400 hover:text-red-200"
              aria-label="Delete comment"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editingText}
              onChange={(e) => onChangeEditingText(e.target.value)}
              className="w-full resize-vertical rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              placeholder="Update your comment"
            />
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
                disabled={!editingText.trim() || editingText.trim() === trimmedOriginal}
              >
                Save
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-lg px-3 py-1.5 text-gray-300 transition hover:bg-gray-800 hover:text-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
            {comment.content}
          </div>
        )}
      </div>
    </div>
  );
}
