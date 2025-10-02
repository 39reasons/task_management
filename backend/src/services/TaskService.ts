import { query } from "../db/index.js";
import type { Task } from "@shared/types";

const TASK_FIELDS_SELECT = `
  t.id,
  t.project_id,
  t.title,
  t.description,
  to_char(t.due_date, 'YYYY-MM-DD') AS due_date,
  t.priority,
  t.status,
  t.assigned_to
`;

const TASK_FIELDS_RETURNING = `
  id,
  project_id,
  title,
  description,
  to_char(due_date, 'YYYY-MM-DD') AS due_date,
  priority,
  status,
  assigned_to
`;

export async function getTasks(project_id: string, user_id: string | null): Promise<Task[]> {
  if (user_id) {
    const result = await query<Task>(
      `
      SELECT ${TASK_FIELDS_SELECT}
      FROM tasks t
      WHERE t.project_id = $1
        AND (
          EXISTS (
            SELECT 1 FROM user_projects up
            WHERE up.project_id = t.project_id AND up.user_id = $2
          )
          OR EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = t.project_id AND p.is_public = true
          )
        )
      ORDER BY t.id ASC
      `,
      [project_id, user_id]
    );
    return result.rows;
  } else {
    const result = await query<Task>(
      `
      SELECT ${TASK_FIELDS_SELECT}
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.project_id = $1
        AND p.is_public = true
      ORDER BY t.id ASC
      `,
      [project_id]
    );
    return result.rows;
  }
}

export async function getAllVisibleTasks(user_id: string | null): Promise<Task[]> {
  if (user_id) {
    const result = await query<Task>(
      `
      SELECT ${TASK_FIELDS_SELECT}
      FROM tasks t
      WHERE EXISTS (
        SELECT 1 FROM user_projects up
        WHERE up.project_id = t.project_id AND up.user_id = $1
      )
      OR EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = t.project_id AND p.is_public = true
      )
      ORDER BY t.id ASC
      `,
      [user_id]
    );
    return result.rows;
  } else {
    const result = await query<Task>(
      `
      SELECT ${TASK_FIELDS_SELECT}
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE p.is_public = true
      ORDER BY t.id ASC
      `
    );
    return result.rows;
  }
}

export async function addTask({
  project_id,
  title,
  status,
}: {
  project_id: string;
  title: string;
  status: string;
}): Promise<Task> {
  const result = await query<Task>(
    `
    INSERT INTO tasks (project_id, title, status)
    VALUES ($1, $2, $3)
    RETURNING ${TASK_FIELDS_RETURNING}
    `,
    [project_id, title, status]
  );
  return result.rows[0];
}

export async function deleteTask(id: string): Promise<boolean> {
  const result = await query("DELETE FROM tasks WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function updateTaskPriority(id: string, priority: string): Promise<Task> {
  const result = await query<Task>(
    `
    UPDATE tasks
    SET priority = $2
    WHERE id = $1
    RETURNING ${TASK_FIELDS_RETURNING}
    `,
    [id, priority]
  );
  return result.rows[0];
}

export async function updateTaskStatus(id: string, status: string): Promise<Task> {
  const result = await query<Task>(
    `
    UPDATE tasks
    SET status = $2
    WHERE id = $1
    RETURNING ${TASK_FIELDS_RETURNING}
    `,
    [id, status]
  );
  return result.rows[0];
}

export async function updateTask(
  id: string,
  title?: string,
  description?: string,
  due_date?: string,
  priority?: string,
  status?: string,
  assigned_to?: string
): Promise<Task> {
  const normalized_due_date = !due_date || due_date.trim() === "" ? null : due_date;
  const result = await query<Task>(
    `
    UPDATE tasks
    SET title = COALESCE($2, title),
        description = COALESCE($3, description),
        due_date = COALESCE($4::DATE, due_date),
        priority = COALESCE($5, priority),
        status = COALESCE($6, status),
        assigned_to = COALESCE($7, assigned_to)
    WHERE id = $1
    RETURNING ${TASK_FIELDS_RETURNING}
    `,
    [id, title ?? null, description ?? null, normalized_due_date, priority ?? null, status ?? null, assigned_to ?? null]
  );
  return result.rows[0];
}

export async function getTaskById(id: string) {
  const result = await query<Task>(
    `
    SELECT 
      id,
      title,
      description,
      to_char(due_date, 'YYYY-MM-DD') AS due_date,
      priority,
      status,
      project_id,
      assigned_to
    FROM tasks
    WHERE id = $1
    `,
    [id]
  );
  return result.rows[0] || null;
}
