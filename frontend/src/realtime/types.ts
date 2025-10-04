import type { Comment, Notification, Task } from "@shared/types";

export interface TaskReorderedEvent {
  type: "tasks.reordered";
  project_id: string;
  stage_id: string;
  task_ids: string[];
  origin?: string | null;
}

export interface TaskCreatedEvent {
  type: "tasks.created";
  project_id: string;
  stage_id: string;
  task: Task;
  origin?: string | null;
}

export interface TaskDeletedEvent {
  type: "tasks.deleted";
  project_id: string;
  stage_id: string;
  task_id: string;
  origin?: string | null;
}

export interface TaskUpdatedEvent {
  type: "tasks.updated";
  project_id: string;
  stage_id: string;
  task: Task;
  origin?: string | null;
}

export interface NotificationCreatedEvent {
  type: "notifications.created";
  recipient_id: string;
  notification: Notification;
}

export interface CommentCreatedEvent {
  type: "comments.created";
  project_id: string;
  stage_id: string;
  task_id: string;
  comment: Comment;
  origin?: string | null;
}

export interface CommentUpdatedEvent {
  type: "comments.updated";
  project_id: string;
  stage_id: string;
  task_id: string;
  comment: Comment;
  origin?: string | null;
}

export interface CommentDeletedEvent {
  type: "comments.deleted";
  project_id: string;
  stage_id: string;
  task_id: string;
  comment_id: string;
  origin?: string | null;
}

export type RealtimeEvent =
  | TaskReorderedEvent
  | TaskCreatedEvent
  | TaskDeletedEvent
  | TaskUpdatedEvent
  | NotificationCreatedEvent
  | CommentCreatedEvent
  | CommentUpdatedEvent
  | CommentDeletedEvent;

export type EventType = RealtimeEvent["type"];

export type EventPayload<T extends EventType> = Extract<RealtimeEvent, { type: T }>;
