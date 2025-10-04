import { broadcast, type RealtimeEvent } from "./server.js";
import type { Comment, Notification, Task } from "@shared/types";

export function broadcastTaskReorder(
  projectId: string,
  stageId: string,
  taskIds: string[],
  origin?: string | null
) {
  const event: RealtimeEvent = {
    type: "tasks.reordered",
    project_id: projectId,
    stage_id: stageId,
    task_ids: taskIds,
    origin: origin ?? null,
  };
  broadcast(event);
}

export function broadcastNotificationCreated(recipientId: string, notification: Notification) {
  const event: RealtimeEvent = {
    type: "notifications.created",
    recipient_id: recipientId,
    notification,
  };
  broadcast(event);
}

export function broadcastTaskCreated(task: Task, origin?: string | null) {
  const event: RealtimeEvent = {
    type: "tasks.created",
    project_id: task.project_id,
    stage_id: task.stage_id,
    task,
    origin: origin ?? null,
  };
  broadcast(event);
}

export function broadcastTaskDeleted(
  projectId: string,
  stageId: string,
  taskId: string,
  origin?: string | null
) {
  const event: RealtimeEvent = {
    type: "tasks.deleted",
    project_id: projectId,
    stage_id: stageId,
    task_id: taskId,
    origin: origin ?? null,
  };
  broadcast(event);
}

export function broadcastTaskUpdated(task: Task, origin?: string | null) {
  const event: RealtimeEvent = {
    type: "tasks.updated",
    project_id: task.project_id,
    stage_id: task.stage_id,
    task,
    origin: origin ?? null,
  };
  broadcast(event);
}

export function broadcastCommentCreated(
  projectId: string,
  stageId: string,
  taskId: string,
  comment: Comment,
  origin?: string | null
) {
  const event: RealtimeEvent = {
    type: "comments.created",
    project_id: projectId,
    stage_id: stageId,
    task_id: taskId,
    comment,
    origin: origin ?? null,
  };
  broadcast(event);
}

export function broadcastCommentUpdated(
  projectId: string,
  stageId: string,
  taskId: string,
  comment: Comment,
  origin?: string | null
) {
  const event: RealtimeEvent = {
    type: "comments.updated",
    project_id: projectId,
    stage_id: stageId,
    task_id: taskId,
    comment,
    origin: origin ?? null,
  };
  broadcast(event);
}

export function broadcastCommentDeleted(
  projectId: string,
  stageId: string,
  taskId: string,
  commentId: string,
  origin?: string | null
) {
  const event: RealtimeEvent = {
    type: "comments.deleted",
    project_id: projectId,
    stage_id: stageId,
    task_id: taskId,
    comment_id: commentId,
    origin: origin ?? null,
  };
  broadcast(event);
}
