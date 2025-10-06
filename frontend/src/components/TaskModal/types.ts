import type { AuthUser, Comment } from "@shared/types";

export type CommentWithUser = Comment & {
  user?: AuthUser | null;
  created_at: string;
  updated_at?: string | null;
};

export type TaskDraftResponse = {
  title?: string | null;
  description?: string | null;
  priority?: string | null;
  due_date?: string | null;
  tags?: string[] | null;
  subtasks?: string[] | null;
};