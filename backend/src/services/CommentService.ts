import { query } from "../db/index.js";
import type { Comment } from "@shared/types";
import {
  broadcastCommentCreated,
  broadcastCommentDeleted,
  broadcastCommentUpdated,
} from "../realtime/publish.js";
import { getTaskById } from "./TaskService.js";

export async function addComment(
  task_id: string,
  userId: string,
  content: string,
  options?: { origin?: string | null }
): Promise<Comment> {
  const result = await query<Comment>(
    `
    INSERT INTO comments (task_id, user_id, content)
    VALUES ($1, $2, $3)
    RETURNING 
      id,
      task_id,
      user_id,
      content,
      created_at,
      updated_at,
      (
        SELECT json_build_object(
          'id', u.id,
          'username', u.username,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'avatar_color', u.avatar_color
        )
        FROM users u
        WHERE u.id = $2
      ) AS user
    `,
    [task_id, userId, content]
  );
  const comment = result.rows[0] as Comment;
  const task = await getTaskById(task_id);
  if (task) {
    broadcastCommentCreated(task.project_id, task.stage_id, task_id, comment, options?.origin ?? null);
  }
  return comment;
}

export async function getCommentsByTask(task_id: string): Promise<Comment[]> {
  const result = await query<Comment>(
    `
    SELECT 
      c.id,
      c.task_id,
      c.user_id,
      c.content,
      c.created_at,
      c.updated_at,
      json_build_object(
        'id', u.id,
        'username', u.username,
        'first_name', u.first_name,
        'last_name', u.last_name,
        'avatar_color', u.avatar_color
      ) AS user
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.task_id = $1
    ORDER BY c.created_at ASC
    `,
    [task_id]
  );
  return result.rows as Comment[];
}

export async function deleteComment(
  id: string,
  userId: string,
  options?: { origin?: string | null }
): Promise<boolean> {
  const result = await query<{ id: string; task_id: string }>(
    "DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id, task_id",
    [id, userId]
  );
  const deleted = (result.rowCount ?? 0) > 0;
  if (deleted) {
    const task = await getTaskById(result.rows[0].task_id);
    if (task) {
      broadcastCommentDeleted(task.project_id, task.stage_id, task.id, result.rows[0].id, options?.origin ?? null);
    }
  }
  return deleted;
}

export async function updateComment(
  id: string,
  userId: string,
  content: string,
  options?: { origin?: string | null }
): Promise<Comment> {
  const result = await query<Comment>(
    `
    UPDATE comments
    SET content = $3,
        updated_at = now()
    WHERE id = $1 AND user_id = $2
    RETURNING 
      id,
      task_id,
      user_id,
      content,
      created_at,
      updated_at,
      (
        SELECT json_build_object(
          'id', u.id,
          'username', u.username,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'avatar_color', u.avatar_color
        )
        FROM users u
        WHERE u.id = user_id
      ) AS user
    `,
    [id, userId, content]
  );

  const updated = result.rows[0];
  if (!updated) {
    throw new Error("Comment not found or not authorized");
  }
  const comment = updated as Comment;
  const task = await getTaskById(comment.task_id);
  if (task) {
    broadcastCommentUpdated(task.project_id, task.stage_id, comment.task_id, comment, options?.origin ?? null);
  }
  return comment;
}
