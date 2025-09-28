import { query } from "../db/index.js";
import type { Task } from "@shared/types";

export async function getTasks(): Promise<Task[]> {
  const result = await query<Task>(
    `SELECT
       id,
       title,
       description,
       to_char(due_date, 'YYYY-MM-DD') AS "dueDate",
       priority,
       status
     FROM tasks
     ORDER BY id ASC`
  );
  return result.rows;
}

export async function addTask({
  title,
  description,
  dueDate,
  priority,
  status,
}: {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: string;
  status?: string;
}): Promise<Task> {
  const result = await query<Task>(
    `INSERT INTO tasks (title, description, due_date, priority, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id,
               title,
               description,
               to_char(due_date, 'YYYY-MM-DD') AS "dueDate",
               priority,
               status`,
    [title, description ?? null, dueDate ?? null, priority ?? "low", status ?? "todo"]
  );
  return result.rows[0];
}

export async function deleteTask(id: string): Promise<boolean> {
  const result = await query<Task>(
    "DELETE FROM tasks WHERE id = $1",
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function updateTaskPriority(id: string, priority: string) {
  const result = await query<Task>(
    `UPDATE tasks
     SET priority = $1
     WHERE id = $2
     RETURNING id,
               title,
               description,
               to_char(due_date, 'YYYY-MM-DD') AS "dueDate",
               priority,
               status`,
    [priority, id]
  );

  if (result.rowCount === 0) {
    throw new Error(`Task with id=${id} not found`);
  }

  return result.rows[0];
}

export async function updateTaskStatus(id: string, status: string) {
  const result = await query<Task>(
    `UPDATE tasks
     SET status = $1
     WHERE id = $2
     RETURNING id,
               title,
               description,
               to_char(due_date, 'YYYY-MM-DD') AS "dueDate",
               priority,
               status`,
    [status, id]
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
  const cleanTitle = title === "" ? null : title;
  const cleanDescription = description === "" ? null : description;
  const cleanDueDate = dueDate === "" ? null : dueDate;
  const cleanPriority = priority === "" ? null : priority;
  const cleanStatus = status === "" ? null : status;

  const numericId = parseInt(id, 10);

  const result = await query<Task>(
    `UPDATE tasks
     SET 
       title = COALESCE($2, title),
       description = COALESCE($3, description),
       due_date = COALESCE($4, due_date),
       priority = COALESCE($5, priority),
       status = COALESCE($6, status)
     WHERE id = $1
     RETURNING id,
               title,
               description,
               to_char(due_date, 'YYYY-MM-DD') AS "dueDate",
               priority,
               status`,
    [numericId, cleanTitle, cleanDescription, cleanDueDate, cleanPriority, cleanStatus]
  );

  if (result.rowCount === 0) {
    throw new Error(`Task with id ${id} not found`);
  }

  return result.rows[0];
}
