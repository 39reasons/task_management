import { pool } from "../db/index.js";

const TASK_FIELDS = `
  id, project_id, title, description, due_date, priority, status
`;

export async function getTasks(projectId?: string) {
  if (projectId) {
    const result = await pool.query(
      `SELECT ${TASK_FIELDS} FROM tasks WHERE project_id = $1 ORDER BY id ASC`,
      [projectId]
    );
    return result.rows;
  }

  const result = await pool.query(
    `SELECT ${TASK_FIELDS} FROM tasks ORDER BY id ASC`
  );
  return result.rows;
}

export async function addTask({
  projectId,
  title,
  description,
  dueDate,
  priority,
  status,
}: {
  projectId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority?: string;
  status?: string;
}) {
  const result = await pool.query(
    `INSERT INTO tasks (project_id, title, description, due_date, priority, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${TASK_FIELDS}`,
    [projectId || null, title, description, dueDate, priority, status]
  );
  return result.rows[0];
}

export async function deleteTask(id: string) {
  await pool.query("DELETE FROM tasks WHERE id = $1", [id]);
  return true;
}

export async function updateTaskPriority(id: string, priority: string) {
  const result = await pool.query(
    `UPDATE tasks SET priority = $2 WHERE id = $1 RETURNING ${TASK_FIELDS}`,
    [id, priority]
  );
  return result.rows[0];
}

export async function updateTaskStatus(id: string, status: string) {
  const result = await pool.query(
    `UPDATE tasks SET status = $2 WHERE id = $1 RETURNING ${TASK_FIELDS}`,
    [id, status]
  );
  return result.rows[0];
}

export async function updateTask(
  id: string,
  title?: string,
  description?: string,
  dueDate?: string,
  priority?: string,
  status?: string
) {
  const result = await pool.query(
    `UPDATE tasks
     SET title = COALESCE($2, title),
         description = COALESCE($3, description),
         due_date = COALESCE($4, due_date),
         priority = COALESCE($5, priority),
         status = COALESCE($6, status)
     WHERE id = $1
     RETURNING ${TASK_FIELDS}`,
    [id, title, description, dueDate, priority, status]
  );
  return result.rows[0];
}
