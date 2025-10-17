import { Fragment, type FormEvent } from "react";
import { CornerDownLeft, Edit3, Trash2, Dot } from "lucide-react";
import { getFullName, getInitials } from "../../utils/user";
import { DEFAULT_AVATAR_COLOR } from "../../constants/colors";
import type { CommentWithUser } from "./types";
import { Button, Input, Textarea } from "../ui";
import { cn } from "../../lib/utils";
import { timeAgo } from "./utils";

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
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-[hsl(var(--card))] px-4 py-2 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
          <Input
            type="text"
            className="flex-1 border-0 bg-transparent px-0 text-sm text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Write a comment..."
            value={commentText}
            onChange={(event) => onCommentTextChange(event.target.value)}
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            disabled={!trimmedComment}
            className={cn(
              "h-8 w-8 rounded-full border border-transparent text-muted-foreground",
              trimmedComment && "text-primary hover:border-primary/40 hover:bg-primary/10"
            )}
            aria-label="Submit comment"
          >
            <CornerDownLeft className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <Fragment>
          <div className="text-sm font-semibold text-foreground">Comments</div>
          <div className="space-y-3">
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
      className={cn(
        "group relative flex gap-3 rounded-lg border border-border bg-[hsl(var(--card))] p-3 shadow-sm transition hover:border-primary/20 hover:bg-muted/40",
        isEditing && "border-primary/50 bg-primary/5"
      )}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase text-primary"
        style={{ backgroundColor: comment.user?.avatar_color || DEFAULT_AVATAR_COLOR }}
      >
        {comment.user ? getInitials(comment.user) : "?"}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            {comment.user ? getFullName(comment.user) : "Unknown"}
          </span>
          {comment.user?.username && <span className="text-muted-foreground/80">@{comment.user.username}</span>}
          <Dot size={14} className="text-muted-foreground/50" />
          <span>{timeAgo(Number(comment.created_at))}</span>
          {isEdited && <span className="text-muted-foreground/70">(edited)</span>}
        </div>

        {isOwn && !isEditing && (
          <div className="absolute right-3 top-3 hidden items-center gap-2 group-hover:flex">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onStartEdit}
              className="h-7 w-7 rounded-full border border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary"
              aria-label="Edit comment"
            >
              <Edit3 size={14} />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onDelete}
              className="h-7 w-7 rounded-full border border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary"
              aria-label="Delete comment"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editingText}
              onChange={(event) => onChangeEditingText(event.target.value)}
              className="w-full resize-vertical text-sm"
              placeholder="Update your comment"
            />
            <div className="flex gap-2 text-xs">
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                className="h-8 px-3"
                disabled={!editingText.trim() || editingText.trim() === trimmedOriginal}
              >
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onCancelEdit}
                className="h-8 px-3 text-muted-foreground"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {comment.content}
          </div>
        )}
      </div>
    </div>
  );
}
