import { query } from "../db/index.js";
import type { Comment } from "../../../shared/types.js";
import { getTaskById } from "./TaskService.js";

export async function addComment(
  work_item_id: string,
  userId: string,
  content: string,
  options?: { origin?: string | null }
): Promise<Comment> {
  const result = await query<Comment>(
    `
    INSERT INTO comments (work_item_id, user_id, content)
    VALUES ($1, $2, $3)
    RETURNING 
      id,
      work_item_id,
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
    [work_item_id, userId, content]
  );
  const comment = result.rows[0] as Comment;
  (comment as unknown as { task_id?: string }).task_id = comment.work_item_id;
  return comment;
}

export async function getCommentsByTask(task_id: string): Promise<Comment[]> {
  const result = await query<Comment>(
    `
    SELECT 
      c.id,
      c.work_item_id,
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
    WHERE c.work_item_id = $1
    ORDER BY c.created_at ASC
    `,
    [task_id]
  );
  const comments = result.rows as Comment[];
  for (const comment of comments as Array<Comment & { task_id?: string }>) {
    comment.task_id = comment.work_item_id;
  }
  return comments;
}

export async function deleteComment(
  id: string,
  userId: string,
  options?: { origin?: string | null }
): Promise<boolean> {
  const result = await query<{ id: string; task_id: string }>(
    "DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id, work_item_id AS task_id",
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
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
      work_item_id,
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
  (updated as unknown as { task_id?: string }).task_id = (updated as unknown as { work_item_id: string }).work_item_id;
  return updated as Comment;
}
