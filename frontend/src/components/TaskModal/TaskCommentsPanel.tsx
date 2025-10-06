import { Fragment, type FormEvent } from "react";
import { CornerDownLeft, Edit3, Trash2, Dot } from "lucide-react";
import { getFullName, getInitials } from "../../utils/user";
import { DEFAULT_AVATAR_COLOR } from "../../constants/colors";
import type { CommentWithUser } from "./types";

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

export function TaskCommentsPanel({
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
    <div className="flex flex-col pl-0">
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex items-center gap-3 rounded-xl border border-gray-600/60 bg-gray-900/80 px-4 py-2 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30">
          <input
            type="text"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-400 focus:outline-none"
            placeholder="Write a comment..."
            value={commentText}
            onChange={(event) => onCommentTextChange(event.target.value)}
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
                  onStartEdit={() => onStartEditComment(comment.id, comment.content)}
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
          {comment.user?.username && <span className="text-gray-500">@{comment.user.username}</span>}
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
              onChange={(event) => onChangeEditingText(event.target.value)}
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
