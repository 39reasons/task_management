import type {
  AuthUser,
  Comment,
  TaskHistoryEvent,
  TaskHistoryEventType,
  User,
} from "@shared/types";

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

export type ProjectMember = Pick<
  User,
  "id" | "first_name" | "last_name" | "username" | "avatar_color"
>;

export interface TaskHistoryEntry {
  id: string;
  eventType: TaskHistoryEventType;
  createdAt: string;
  actor: (AuthUser | User) | null;
  actorId: string | null;
  message: string;
  details?: string | null;
  payload: TaskHistoryEvent["payload"];
}
