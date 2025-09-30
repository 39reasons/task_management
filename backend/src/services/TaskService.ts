import { query } from "../db/index.js";
import type { Task } from "@shared/types";

const TASK_FIELDS_SELECT = `
  t.id,
  t.project_id AS "projectId",
  t.title,
  t.description,
  to_char(t.due_date, 'YYYY-MM-DD') AS "dueDate",
  t.priority,
  t.status,
  t.assigned_to AS "assignedTo"
`;

const TASK_FIELDS_RETURNING = `
  id,
  project_id AS "projectId",
  title,
  description,
  to_char(due_date, 'YYYY-MM-DD') AS "dueDate",
  priority,
  status,
  assigned_to AS "assignedTo"
`;

export async function getTasks(projectId: string, userId: string | null): Promise<Task[]> {
  if (userId) {
    // Logged in: tasks from this project if member OR project is public
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
      [projectId, userId]
    );
    return result.rows;
  } else {
    // Guest: only tasks from public project
    const result = await query<Task>(
      `
      SELECT ${TASK_FIELDS_SELECT}
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.project_id = $1
        AND p.is_public = true
      ORDER BY t.id ASC
      `,
      [projectId]
    );
    return result.rows;
  }
}

export async function getAllVisibleTasks(userId: string | null): Promise<Task[]> {
  if (userId) {
    // Logged in: tasks from user’s projects OR public projects
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
      [userId]
    );
    return result.rows;
  } else {
    // Guest: only public tasks
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

//
export async function addTask({
  projectId,
  title,
  description,
  dueDate,
  priority,
  status,
  assignedTo,
}: {
  projectId: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority?: string;
  status?: string;
  assignedTo?: string;
}): Promise<Task> {
  const result = await query<Task>(
    `
    INSERT INTO tasks (project_id, title, description, due_date, priority, status, assigned_to)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING ${TASK_FIELDS_RETURNING}
    `,
    [projectId, title, description ?? null, dueDate ?? null, priority ?? "medium", status ?? "todo", assignedTo ?? null]
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
  dueDate?: string,
  priority?: string,
  status?: string,
  assignedTo?: string
): Promise<Task> {
  const normalizedDueDate = !dueDate || dueDate.trim() === "" ? null : dueDate;
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
    [id, title ?? null, description ?? null, normalizedDueDate, priority ?? null, status ?? null, assignedTo ?? null]
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
      to_char(due_date, 'YYYY-MM-DD') AS "dueDate",
      priority,
      status,
      project_id AS "projectId"
    FROM tasks
    WHERE id = $1
    `,
    [id]
  );
  return result.rows[0] || null;
}
