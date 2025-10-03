import type { Project, Task, User } from "@shared/types";
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

export async function getProjects(user_id?: string): Promise<Project[]> {
  if (user_id) {
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
      [user_id]
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
  user_id: string
): Promise<Project> {
  const projRes = await query<Project>(
    `
    SELECT ${PROJECT_FIELDS_SELECT}
    FROM projects p
    JOIN user_projects up ON up.project_id = p.id
    WHERE p.id = $1 AND up.user_id = $2
    `,
    [id, user_id]
  );

  if (projRes.rowCount === 0) {
    throw new Error("Project not found or not accessible");
  }

  const taskRes = await query<Task>(
    `
    SELECT
      t.id,
      t.title,
      t.description,
      to_char(t.due_date, 'YYYY-MM-DD') AS due_date,
      t.priority,
      t.stage_id,
      w.project_id
    FROM tasks t
    JOIN stages s ON s.id = t.stage_id
    JOIN workflows w ON w.id = s.workflow_id
    WHERE w.project_id = $1
    ORDER BY s.position ASC, t.created_at ASC
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
  is_public: boolean = false,
  user_id: string
): Promise<Project> {
  const result = await query<Project>(
    `
    INSERT INTO projects (name, description, is_public)
    VALUES ($1, $2, $3)
    RETURNING ${PROJECT_FIELDS_RETURNING}
    `,
    [name, description, is_public]
  );

  const project = result.rows[0];

  await query(
    `INSERT INTO user_projects (user_id, project_id) VALUES ($1, $2)`,
    [user_id, project.id]
  );

  await query(
    `
    INSERT INTO workflows (project_id, name)
    VALUES ($1, $2)
    `,
    [project.id, `${project.name} Board`]
  );

  return project;
}

export async function updateProject(
  id: string,
  user_id: string,
  name?: string,
  description?: string,
  is_public?: boolean
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
    RETURNING ${PROJECT_FIELDS_RETURNING}
    `,
    [id, user_id, name, description, is_public]
  );

  if (result.rowCount === 0) throw new Error("Project not found or not accessible");
  return result.rows[0];
}

export async function deleteProject(
  id: string,
  user_id: string
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
    [id, user_id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getProjectMembers(project_id: string): Promise<User[]> {
  const result = await query<User>(
    `
    SELECT u.id, u.name, u.username, u.created_at, u.updated_at
    FROM user_projects up
    JOIN users u ON u.id = up.user_id
    WHERE up.project_id = $1
    ORDER BY u.name ASC
    `,
    [project_id]
  );

  return result.rows;
}

export async function userHasProjectAccess(project_id: string, user_id: string): Promise<boolean> {
  const result = await query(
    `
    SELECT 1
    FROM projects p
    WHERE p.id = $1
      AND (
        p.is_public = true
        OR EXISTS (
          SELECT 1 FROM user_projects up
          WHERE up.project_id = p.id AND up.user_id = $2
        )
      )
    `,
    [project_id, user_id]
  );

  return (result.rowCount ?? 0) > 0;
}
