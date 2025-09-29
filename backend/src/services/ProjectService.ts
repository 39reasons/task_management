import type { Project, Task } from "@shared/types";
import { query } from "../db/index.js";

const PROJECT_FIELDS_SELECT = `
  p.id,
  p.name,
  p.description,
  p.created_at,
  p.updated_at,
  p.is_public
`;

const PROJECT_FIELDS_RETURNING = `
  id,
  name,
  description,
  created_at,
  updated_at,
  is_public
`;

export async function getProjects(userId?: string): Promise<Project[]> {
  if (userId) {
    const result = await query<Project>(
      `
      SELECT ${PROJECT_FIELDS_SELECT}
      FROM projects p
      WHERE p.is_public = true
         OR EXISTS (
            SELECT 1 FROM user_projects up
            WHERE up.project_id = p.id AND up.user_id = $1
         )
      ORDER BY p.created_at DESC
      `,
      [userId]
    );
    return result.rows;
  } else {
    const result = await query<Project>(
      `
      SELECT ${PROJECT_FIELDS_SELECT}
      FROM projects p
      WHERE p.is_public = true
      ORDER BY p.created_at DESC
      `
    );
    return result.rows;
  }
}


export async function getProjectById(
  id: string,
  userId: string
): Promise<Project> {
  const projRes = await query<Project>(
    `
    SELECT ${PROJECT_FIELDS_SELECT}
    FROM projects p
    JOIN user_projects up ON up.project_id = p.id
    WHERE p.id = $1 AND up.user_id = $2
    `,
    [id, userId]
  );

  if (projRes.rowCount === 0) {
    throw new Error("Project not found or not accessible");
  }

  const taskRes = await query<Task>(
    `
    SELECT id,
           title,
           description,
           to_char(due_date, 'YYYY-MM-DD') AS "dueDate",
           priority,
           status,
           project_id AS "projectId",
           assigned_to AS "assignedTo"
    FROM tasks
    WHERE project_id = $1
    ORDER BY created_at ASC
    `,
    [id]
  );

  return {
    ...projRes.rows[0],
    tasks: taskRes.rows,
  };
}

export async function addProject(
  name: string,
  description: string | null,
  isPublic: boolean = false,
  userId: string
): Promise<Project> {
  const result = await query<Project>(
    `
    INSERT INTO projects (name, description, is_public)
    VALUES ($1, $2, $3)
    RETURNING ${PROJECT_FIELDS_SELECT}, is_public
    `,
    [name, description, isPublic]
  );
  const project = result.rows[0];

  await query(
    `INSERT INTO user_projects (user_id, project_id) VALUES ($1, $2)`,
    [userId, project.id]
  );

  return project;
}

export async function updateProject(
  id: string,
  userId: string,
  name?: string,
  description?: string,
  isPublic?: boolean
): Promise<Project> {
  const result = await query<Project>(
    `
    UPDATE projects p
    SET name = COALESCE($3, name),
        description = COALESCE($4, description),
        is_public = COALESCE($5, is_public),
        updated_at = now()
    WHERE p.id = $1
      AND EXISTS (
        SELECT 1 FROM user_projects up
        WHERE up.project_id = p.id AND up.user_id = $2
      )
    RETURNING ${PROJECT_FIELDS_RETURNING}, is_public
    `,
    [id, userId, name, description, isPublic]
  );

  if (result.rowCount === 0) throw new Error("Project not found or not accessible");
  return result.rows[0];
}

export async function deleteProject(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await query(
    `
    DELETE FROM projects
    WHERE id = $1
      AND EXISTS (
        SELECT 1
        FROM user_projects
        WHERE user_id = $2 AND project_id = $1
      )
    `,
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}
