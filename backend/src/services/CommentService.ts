import { query } from "../db/index.js";

export async function addComment(taskId: string, userId: string, content: string) {
  const result = await query(
    `
    INSERT INTO comments (task_id, user_id, content)
    VALUES ($1, $2, $3)
    RETURNING 
      id,
      task_id AS "taskId",
      user_id AS "userId",
      content,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    `,
    [taskId, userId, content]
  );
  return result.rows[0];
}

export async function getCommentsByTask(taskId: string) {
  const result = await query(
    `
    SELECT 
      id,
      task_id AS "taskId",
      user_id AS "userId",
      content,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM comments
    WHERE task_id = $1
    ORDER BY created_at ASC
    `,
    [taskId]
  );
  return result.rows;
}

export async function deleteComment(id: string, userId: string) {
  const result = await query(
    `DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}
