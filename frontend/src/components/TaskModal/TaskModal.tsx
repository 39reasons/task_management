import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
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
} from "../../graphql";
import { SendHorizonal, Plus, Dot, X, Edit3, AlignLeft, Trash2 } from "lucide-react";
import { useModal } from "../ModalStack";
import { getFullName, getInitials } from "../../utils/user";

interface TaskModalProps {
  task: Task | null;
  currentUser: AuthUser | null;
  onTaskUpdate?: (task: Task) => void;
}

function timeAgo(timestamp: number) {
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000); // in seconds

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo ago`;
  return `${Math.floor(diff / 31536000)}y ago`;
}

export function TaskModal({ task, currentUser, onTaskUpdate }: TaskModalProps) {
  const { modals, closeModal, openModal } = useModal();
  const isOpen = modals.includes("task");
  const currentUserId = currentUser?.id ?? null;

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

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setInitialTitle(task.title || "");
      setDescription(task.description ?? "");
      setInitialDescription(task.description ?? "");
      setDueDate(task.due_date || "");
      setPriority(task.priority ?? null);
      setEditingCommentId(null);
      setEditingCommentText("");
      setCommentText("");
    }
  }, [task]);

  useEffect(() => {
    if (tagsData?.task?.tags) {
      setTags(tagsData.task.tags);
    }
  }, [tagsData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.stopPropagation();
        saveAllChanges();
        closeModal("task");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, title, description, dueDate, priority]);

  if (!isOpen || !task) return null;

  const saveAllChanges = () => {
    if (!task) return;

    let updatedTask = { ...task };

    if (!title.trim()) {
      setTitle(initialTitle);
    } else if (title !== initialTitle) {
      updateTask({ variables: { id: task.id, title } });
      setInitialTitle(title);
      updatedTask = { ...updatedTask, title };
    }

    const normalizedDescription = description.trim();
    const currentDescription = task.description ?? "";
    if (normalizedDescription !== currentDescription.trim()) {
      const payload = normalizedDescription ? normalizedDescription : null;
      updateTask({ variables: { id: task.id, description: payload } });
      updatedTask = { ...updatedTask, description: payload ?? null };
      setInitialDescription(normalizedDescription);
      setDescription(normalizedDescription);
      setIsEditingDescription(false);
    }

    if (dueDate !== task.due_date) {
      updateTask({ variables: { id: task.id, due_date: dueDate || null } });
      updatedTask = { ...updatedTask, due_date: dueDate || null };
    }

    if (priority !== task.priority) {
      updateTask({ variables: { id: task.id, priority } });
      updatedTask = { ...updatedTask, priority };
    }

    onTaskUpdate?.(updatedTask);
  };

  const commitTitle = () => {
    if (!task) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(initialTitle);
      setIsEditingTitle(false);
      return;
    }
    if (trimmed !== initialTitle) {
      updateTask({ variables: { id: task.id, title: trimmed } });
      setInitialTitle(trimmed);
      onTaskUpdate?.({ ...task, title: trimmed });
    }
    setIsEditingTitle(false);
  };

  const commitDescription = async () => {
    if (!task) return;
    const trimmed = description.trim();
    if (trimmed === initialDescription.trim()) {
      setIsEditingDescription(false);
      setDescription(initialDescription);
      return;
    }

    const payload = trimmed ? trimmed : null;
    await updateTask({ variables: { id: task.id, description: payload } });
    setInitialDescription(trimmed);
    setDescription(trimmed);
    onTaskUpdate?.({ ...task, description: payload });
    setIsEditingDescription(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await addComment({ variables: { task_id: task.id, content: commentText } });
    await refetch();
    setCommentText("");
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!task) return;

    const { data: removeData } = await removeTagFromTask({
      variables: { task_id: task.id, tag_id: tagId },
    });

    const updatedTags = removeData?.removeTagFromTask?.tags ?? tags.filter((tag) => tag.id !== tagId);
    setTags(updatedTags);
    onTaskUpdate?.({ ...task, tags: updatedTags });
  };

  const assignees = task.assignees ?? [];
  const hasTags = tags.length > 0;
  const hasAssignees = assignees.length > 0;

  const handleRemoveMember = async (memberId: string) => {
    if (!task) return;
    const remaining = (task.assignees ?? []).filter((member) => member.id !== memberId);
    await updateTaskMembers({
      variables: { task_id: task.id, member_ids: remaining.map((m) => m.id) },
    });
    onTaskUpdate?.({ ...task, assignees: remaining });
  };

  const cancelDescriptionEdit = () => {
    setDescription(initialDescription);
    setIsEditingDescription(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteCommentMutation({ variables: { id: commentId } });
    await refetch();
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleStartEditComment = (commentId: string, content: string | null) => {
    setEditingCommentId(commentId);
    setEditingCommentText(content ?? "");
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
    <div className="fixed inset-0 z-40 flex items-start justify-center pt-16">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          saveAllChanges();
          closeModal("task");
        }}
      />

      {/* Content */}
      <div
        id="task-modal-root"
        className="
          relative bg-gray-800 rounded-xl shadow-lg w-full max-w-4xl
          max-h-[80vh] overflow-hidden
          grid grid-cols-1 md:grid-cols-2 gap-6 p-6
        "
      >
        {/* Left side */}
        <div className="flex flex-col min-h-0 pr-2">
          <div className="mb-4">
            {isEditingTitle ? (
              <div
                className="flex items-center gap-3 rounded-xl border border-gray-600/60 bg-gray-900/80 px-4 py-2 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30"
              >
                <input
                  type="text"
                  value={title}
                  autoFocus
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitTitle();
                    } else if (e.key === "Escape") {
                      setTitle(initialTitle);
                      setIsEditingTitle(false);
                    }
                  }}
                  className="flex-1 bg-transparent text-xl font-bold leading-tight text-white focus:outline-none"
                />
                <Edit3
                  className={`h-5 w-5 transition ${
                    title.trim()
                      ? "text-blue-300 drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]"
                      : "text-gray-500"
                  }`}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="w-full rounded-xl border border-transparent px-4 py-2 text-left text-xl font-bold leading-tight text-white transition hover:border-gray-600 hover:bg-gray-900/70"
              >
                {title}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
            {/* Task actions */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openModal("tag")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-600 bg-gray-900 text-sm text-white hover:border-gray-400"
                >
                  <Plus size={14} />
                  Tags
                </button>
                <button
                  type="button"
                  onClick={() => openModal("member")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-600 bg-gray-900 text-sm text-white hover:border-gray-400"
                >
                  <Plus size={14} />
                  Members
                </button>
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
                          onClick={() => handleRemoveTag(tag.id)}
                          className="ml-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/50 text-white/80 transition hover:border-red-300 hover:text-red-100"
                          aria-label={`Remove ${tag.name}`}
                        >
                          <X size={12} strokeWidth={2} />
                        </button>
                      </div>
                    ))}
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
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold uppercase text-white">
                          {getInitials(member)}
                        </span>
                        <div className="flex flex-col leading-tight">
                          <span className="font-semibold">{getFullName(member)}</span>
                          <span className="text-[10px] text-gray-300">@{member.username}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.id)}
                          className="ml-1 flex h-5 w-5 items-center justify-center rounded-full border border-gray-500 text-gray-300 transition hover:border-red-400 hover:text-red-300"
                          aria-label={`Remove ${getFullName(member)}`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <AlignLeft className="h-4 w-4 text-gray-400" />
                <span>Description</span>
              </div>

              {isEditingDescription ? (
                <div className="space-y-2">
                  <textarea
                    value={description}
                    autoFocus
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a more detailed description..."
                    className="min-h-[140px] w-full resize-vertical rounded-xl border border-gray-600 bg-gray-900/80 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={commitDescription}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
                      disabled={description.trim() === initialDescription.trim()}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelDescriptionEdit}
                      className="rounded-lg px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-800 hover:text-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : initialDescription ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingDescription(true);
                  }}
                  className="w-full rounded-xl border border-gray-600 bg-gray-900/60 px-4 py-3 text-left text-sm text-gray-200 transition hover:border-blue-500 hover:text-blue-200 whitespace-pre-wrap"
                >
                  {initialDescription}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDescription("");
                    setIsEditingDescription(true);
                  }}
                  className="w-full rounded-xl border border-dashed border-gray-600 px-4 py-6 text-sm text-left text-gray-400 hover:border-blue-500 hover:text-blue-300"
                >
                  Add a more detailed description...
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right side (comments) */}
        <div className="flex flex-col pl-2 border-l border-gray-700/60">
          <form onSubmit={handleAddComment} className="mb-4">
            <div
              className="flex items-center gap-3 rounded-xl border border-gray-600/60 bg-gray-900/80 px-4 py-2 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30"
            >
              <input
                type="text"
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-400 focus:outline-none"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="inline-flex items-center justify-center rounded-full border border-gray-600 p-2 text-white transition hover:border-blue-500 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send comment"
              >
                <SendHorizonal size={16} />
              </button>
            </div>
          </form>

          {!loading && data?.task?.comments?.length ? (
            <>
              <div className="mb-2 text-sm font-semibold text-white">Comments</div>
              <div className="overflow-y-auto min-h-0 pr-2 space-y-2 max-h-[calc(80vh-10rem)]">
                {data.task.comments.map((c: any) => {
                  const isOwn = currentUserId === c.user?.id;
                  const isEditing = editingCommentId === c.id;
                  const trimmedContent = (c.content ?? "").trim();
                  const isEdited = c.updated_at && c.updated_at !== c.created_at;

                  return (
                    <div
                      key={c.id}
                      className={`group relative flex gap-3 rounded-xl border border-gray-700/60 bg-gray-900/70 p-3 shadow-sm transition ${
                        isEditing ? "border-blue-500/80 bg-gray-900/80" : "hover:border-blue-500/70 hover:bg-gray-900/80"
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-sm font-semibold uppercase text-blue-300">
                        {c.user ? getInitials(c.user) : "?"}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                          <span className="font-semibold text-white">
                            {c.user ? getFullName(c.user) : "Unknown"}
                          </span>
                          {c.user?.username && (
                            <span className="text-gray-500">@{c.user.username}</span>
                          )}
                          <Dot size={14} className="text-gray-600" />
                          <span>{timeAgo(Number(c.created_at))}</span>
                          {isEdited && <span className="text-gray-500">(edited)</span>}
                        </div>

                        {isOwn && !isEditing && (
                          <div className="absolute right-3 top-3 hidden items-center gap-2 group-hover:flex">
                            <button
                              type="button"
                              onClick={() => handleStartEditComment(c.id, c.content ?? "")}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-600/70 bg-gray-900/70 text-gray-300 transition hover:border-blue-400 hover:text-blue-200"
                              aria-label="Edit comment"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(c.id)}
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
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              className="w-full resize-vertical rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                              placeholder="Update your comment"
                            />
                            <div className="flex gap-2 text-xs">
                              <button
                                type="button"
                                onClick={handleSubmitCommentEdit}
                                className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
                                disabled={!editingCommentText.trim() || editingCommentText.trim() === trimmedContent}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelCommentEdit}
                                className="rounded-lg px-3 py-1.5 text-gray-300 transition hover:bg-gray-800 hover:text-gray-100"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
                            {c.content}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : !loading && (!data?.task?.comments || data.task.comments.length === 0) ? (
            <p className="text-sm text-gray-500">No comments yet.</p>
          ) : (
            <p className="text-sm text-gray-400">Loading...</p>
          )}
        </div>
      </div>
    </div>
  );
}
