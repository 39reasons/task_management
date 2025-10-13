import type { Project, Task, TeamRole, User } from "../../../shared/types.js";
import { query } from "../db/index.js";

const PROJECT_FIELDS_SELECT = `
  p.id,
  p.team_id,
  p.name,
  p.description,
  p.created_at,
  p.updated_at,
  p.is_public,
  p.position
`;

const PROJECT_FIELDS_RETURNING = `
  id,
  team_id,
  name,
  description,
  created_at,
  updated_at,
  is_public,
  position
`;

type ProjectRow = {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  is_public: boolean;
  position: number | null;
  viewer_role?: TeamRole | null;
};

function normalizeTimestamp(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function mapProjectRow(row: ProjectRow): Project {
  const viewerRole = row.viewer_role ?? null;
  return {
    id: row.id,
    team_id: row.team_id,
    name: row.name,
    description: row.description,
    created_at: normalizeTimestamp(row.created_at),
    updated_at: normalizeTimestamp(row.updated_at),
    is_public: row.is_public,
    position: row.position,
    viewer_role: viewerRole,
    viewer_is_owner: viewerRole === "owner",
  };
}

async function getProjectTeamId(project_id: string): Promise<string | null> {
  const result = await query<{ team_id: string }>(
    `SELECT team_id FROM projects WHERE id = $1`,
    [project_id]
  );
  return result.rows[0]?.team_id ?? null;
}

interface ProjectMembership {
  team_id: string;
  team_role: TeamRole;
  project_role: string | null;
  is_public: boolean;
}

async function getProjectMembership(
  project_id: string,
  user_id: string
): Promise<ProjectMembership | null> {
  const result = await query<ProjectMembership>(
    `
    SELECT
      p.team_id,
      tm.role AS team_role,
      p.is_public,
      up.role AS project_role
    FROM projects p
    JOIN team_members tm
      ON tm.team_id = p.team_id
     AND tm.user_id = $2
     AND tm.status = 'active'
    LEFT JOIN user_projects up
      ON up.project_id = p.id
     AND up.user_id = $2
    WHERE p.id = $1
    LIMIT 1
    `,
    [project_id, user_id]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
}

async function assertProjectPermission(
  project_id: string,
  user_id: string,
  allowedRoles: TeamRole[] = ["owner", "admin", "member"]
): Promise<ProjectMembership & { viewer_role: TeamRole }> {
  const membership = await getProjectMembership(project_id, user_id);
  if (!membership || !membership.project_role) {
    throw new Error("Project not found or not accessible");
  }
  const projectRole = membership.project_role as TeamRole;
  if (allowedRoles.length > 0 && !allowedRoles.includes(projectRole)) {
    throw new Error("Not authorized for this project");
  }
  return { ...membership, viewer_role: projectRole };
}

async function assertTeamMembership(
  team_id: string,
  user_id: string,
  allowedRoles: TeamRole[] = ["owner", "admin", "member"]
): Promise<TeamRole> {
  const result = await query<{ role: TeamRole }>(
    `
    SELECT role
    FROM team_members
    WHERE team_id = $1
      AND user_id = $2
      AND status = 'active'
    LIMIT 1
    `,
    [team_id, user_id]
  );

  if (result.rowCount === 0 || !allowedRoles.includes(result.rows[0].role)) {
    throw new Error("Team not found or not accessible");
  }

  return result.rows[0].role;
}

export async function getProjectsForTeam(
  team_id: string,
  user_id: string
): Promise<Project[]> {
  const teamRole = await assertTeamMembership(team_id, user_id);
  const result = await query<ProjectRow>(
    `
    SELECT
      ${PROJECT_FIELDS_SELECT},
      up.role AS viewer_role
    FROM projects p
    JOIN user_projects up
      ON up.project_id = p.id
     AND up.user_id = $2
    WHERE p.team_id = $1
    ORDER BY
      CASE WHEN p.position IS NULL THEN 1 ELSE 0 END,
      p.position ASC,
      p.created_at DESC
    `,
    [team_id, user_id]
  );

  if ((result.rowCount ?? 0) === 0 && (teamRole === "owner" || teamRole === "admin")) {
    return [];
  }

  return result.rows.map(mapProjectRow);
}

export async function getProjectById(
  id: string,
  user_id: string
): Promise<Project> {
  const membership = await assertProjectPermission(id, user_id);

  const projRes = await query<ProjectRow>(
    `
    SELECT ${PROJECT_FIELDS_SELECT}
    FROM projects p
    WHERE p.id = $1
    `,
    [id]
  );

  if (projRes.rowCount === 0) {
    throw new Error("Project not found or not accessible");
  }

  const project = mapProjectRow({
    ...projRes.rows[0],
    viewer_role: membership.viewer_role,
  });

  const taskRes = await query<Task & { team_id: string }>(
    `
    SELECT
      t.id,
      t.title,
      t.description,
      to_char(t.due_date, 'YYYY-MM-DD') AS due_date,
      t.priority,
      t.status,
      t.stage_id,
      w.project_id,
      p.team_id,
      t.position
    FROM tasks t
    JOIN stages s ON s.id = t.stage_id
    JOIN workflows w ON w.id = s.workflow_id
    JOIN projects p ON p.id = w.project_id
    WHERE w.project_id = $1
    ORDER BY s.position ASC, t.position ASC, t.created_at ASC
    `,
    [id]
  );

  return {
    ...project,
    tasks: taskRes.rows.map((task) => ({
      ...task,
      team_id: task.team_id,
    })),
  };
}

export async function addProject(
  team_id: string,
  name: string,
  description: string | null,
  is_public: boolean,
  user_id: string
): Promise<Project> {
  const role = await assertTeamMembership(team_id, user_id, ["owner", "admin"]);

  const result = await query<ProjectRow>(
    `
    INSERT INTO projects (team_id, name, description, is_public, position)
    VALUES (
      $1,
      $2,
      $3,
      $4,
      (
        SELECT COALESCE(MAX(position), 0) + 1
        FROM projects
        WHERE team_id = $1
      )
    )
    RETURNING ${PROJECT_FIELDS_RETURNING}
    `,
    [team_id, name, description, is_public]
  );

  const project = mapProjectRow({
    ...result.rows[0],
    viewer_role: role,
  });

  await query(
    `
    INSERT INTO user_projects (user_id, project_id, role)
    VALUES ($1, $2, 'owner')
    ON CONFLICT (user_id, project_id) DO NOTHING
    `,
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
  const membership = await assertProjectPermission(id, user_id, ["owner", "admin"]);

  const result = await query<ProjectRow>(
    `
    UPDATE projects
    SET name = COALESCE($2, name),
        description = COALESCE($3, description),
        is_public = COALESCE($4, is_public),
        updated_at = now()
    WHERE id = $1
    RETURNING ${PROJECT_FIELDS_RETURNING}
    `,
    [id, name ?? null, description ?? null, is_public ?? null]
  );

  if (result.rowCount === 0) {
    throw new Error("Project not found or not accessible");
  }

  return mapProjectRow({
    ...result.rows[0],
    viewer_role: membership.viewer_role,
  });
}

export async function deleteProject(
  id: string,
  user_id: string
): Promise<boolean> {
  await assertProjectPermission(id, user_id, ["owner"]);

  const result = await query(`DELETE FROM projects WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function reorderProjects(
  team_id: string,
  project_ids: string[],
  user_id: string
): Promise<boolean> {
  if (project_ids.length === 0) {
    return false;
  }

  await assertTeamMembership(team_id, user_id);

  const countRes = await query<{ count: string }>(
    `
    SELECT COUNT(*)::int AS count
    FROM projects
    WHERE id = ANY($1::uuid[])
      AND team_id = $2
    `,
    [project_ids, team_id]
  );

  const count = Number(countRes.rows[0]?.count ?? 0);
  if (count !== project_ids.length) {
    throw new Error("One or more projects not found in the specified team");
  }

  const result = await query(
    `
    WITH ordered AS (
      SELECT id, ordinality AS position
      FROM unnest($1::uuid[]) WITH ORDINALITY AS t(id, ordinality)
    )
    UPDATE projects p
    SET position = ordered.position,
        updated_at = now()
    FROM ordered
    WHERE p.id = ordered.id
      AND p.team_id = $2
    `,
    [project_ids, team_id]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function getProjectMembers(project_id: string): Promise<User[]> {
  const result = await query<User>(
    `
    SELECT u.id, u.first_name, u.last_name, u.username, u.avatar_color, u.created_at, u.updated_at
    FROM user_projects up
    JOIN users u ON u.id = up.user_id
    WHERE up.project_id = $1
    ORDER BY u.first_name ASC, u.last_name ASC
    `,
    [project_id]
  );

  return result.rows;
}

export async function userHasProjectAccess(
  project_id: string,
  user_id: string
): Promise<boolean> {
  const membership = await getProjectMembership(project_id, user_id);
  if (!membership) {
    return false;
  }
  if (membership.team_role === "owner" || membership.team_role === "admin") {
    return true;
  }
  return membership.project_role !== null;
}

export async function getUserRoleInProject(
  project_id: string,
  user_id: string
): Promise<TeamRole | null> {
  const membership = await getProjectMembership(project_id, user_id);
  if (!membership) return null;
  return (membership.project_role as TeamRole | null) ?? membership.team_role;
}

export async function leaveProject(project_id: string, user_id: string): Promise<boolean> {
  const membership = await getProjectMembership(project_id, user_id);
  if (!membership) {
    throw new Error("You are not a member of this project");
  }

  const projectRoleRes = await query<{ role: string }>(
    `
    SELECT role
    FROM user_projects
    WHERE project_id = $1 AND user_id = $2
    `,
    [project_id, user_id]
  );

  const projectRole = projectRoleRes.rows[0]?.role ?? null;
  await query(
    `
    DELETE FROM user_projects
    WHERE project_id = $1 AND user_id = $2
    `,
    [project_id, user_id]
  );

  await query(
    `
    DELETE FROM task_members
    WHERE user_id = $2
      AND task_id IN (
        SELECT t.id
        FROM tasks t
        JOIN stages s ON s.id = t.stage_id
        JOIN workflows w ON w.id = s.workflow_id
        WHERE w.project_id = $1
      )
    `,
    [project_id, user_id]
  );

  return true;
}
