import { useCallback, useState } from "react";

type CommentOperation = "add" | "update" | "delete";

type UseCommentEditorOptions = {
  onAdd: (content: string) => Promise<void> | void;
  onUpdate: (commentId: string, content: string) => Promise<void> | void;
  onDelete: (commentId: string) => Promise<void> | void;
  errorLabel?: string;
};

type UseCommentEditorResult = {
  commentText: string;
  setCommentText: (value: string) => void;
  editingCommentId: string | null;
  editingCommentText: string;
  setEditingCommentText: (value: string) => void;
  startEditComment: (commentId: string, content: string | null) => void;
  cancelEditComment: () => void;
  submitNewComment: () => Promise<void>;
  submitEditComment: () => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
};

export function useCommentEditor({
  onAdd,
  onUpdate,
  onDelete,
  errorLabel = "comment",
}: UseCommentEditorOptions): UseCommentEditorResult {
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  const handleError = useCallback(
    (operation: CommentOperation, error: unknown) => {
      console.error(`Failed to ${operation} ${errorLabel}`, error);
    },
    [errorLabel]
  );

  const submitNewComment = useCallback(async () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;

    try {
      await onAdd(trimmed);
      setCommentText("");
    } catch (error) {
      handleError("add", error);
    }
  }, [commentText, handleError, onAdd]);

  const startEditComment = useCallback((commentId: string, content: string | null) => {
    setEditingCommentId(commentId);
    setEditingCommentText(content ?? "");
  }, []);

  const cancelEditComment = useCallback(() => {
    setEditingCommentId(null);
    setEditingCommentText("");
  }, []);

  const submitEditComment = useCallback(async () => {
    if (!editingCommentId) return;

    const trimmed = editingCommentText.trim();
    if (!trimmed) return;

    try {
      await onUpdate(editingCommentId, trimmed);
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (error) {
      handleError("update", error);
    }
  }, [editingCommentId, editingCommentText, handleError, onUpdate]);

  const deleteComment = useCallback(
    async (commentId: string) => {
      try {
        await onDelete(commentId);
        if (editingCommentId === commentId) {
          setEditingCommentId(null);
          setEditingCommentText("");
        }
      } catch (error) {
        handleError("delete", error);
      }
    },
    [editingCommentId, handleError, onDelete]
  );

  return {
    commentText,
    setCommentText,
    editingCommentId,
    editingCommentText,
    setEditingCommentText,
    startEditComment,
    cancelEditComment,
    submitNewComment,
    submitEditComment,
    deleteComment,
  };
}
