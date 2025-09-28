import type { Project, Task } from "@shared/types";
import { query } from "../db/index.js";

const PROJECT_FIELDS = `id, name, description`;

export async function getProjects(): Promise<Project[]> {
  const result = await query<Project>(
    `SELECT ${PROJECT_FIELDS} FROM projects ORDER BY id ASC`
  );
  return result.rows;
}

export async function getProjectById(id: string): Promise<Project> {
  const projRes = await query<Project>(
    `SELECT ${PROJECT_FIELDS} FROM projects WHERE id = $1`,
    [id]
  );

  if (projRes.rowCount === 0) {
    throw new Error("Project not found");
  }

  const taskRes = await query<Task>(
    `SELECT id,
            title,
            description,
            to_char(due_date, 'YYYY-MM-DD') AS "dueDate",
            priority,
            status,
            project_id
     FROM tasks
     WHERE project_id = $1
     ORDER BY id ASC`,
    [id]
  );

  return {
    ...projRes.rows[0],
    tasks: taskRes.rows,
  };
}

export async function addProject(
  name: string,
  description?: string
): Promise<Project> {
  const result = await query<Project>(
    `INSERT INTO projects (name, description)
     VALUES ($1, $2)
     RETURNING ${PROJECT_FIELDS}`,
    [name, description ?? null]
  );
  return result.rows[0];
}

export async function deleteProject(id: string): Promise<boolean> {
  const result = await query<Project>(
    "DELETE FROM projects WHERE id = $1",
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}
