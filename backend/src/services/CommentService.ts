import { query } from "../db/index.js";
import type { Comment } from "@shared/types";

export async function addComment(
  task_id: string,
  userId: string,
  content: string
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
          'name', u.name
        )
        FROM users u
        WHERE u.id = $2
      ) AS user
    `,
    [task_id, userId, content]
  );
  return result.rows[0] as Comment;
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
        'name', u.name
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
  userId: string
): Promise<boolean> {
  const result = await query("DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id", [
    id,
    userId,
  ]);
  return (result.rowCount ?? 0) > 0;
}
