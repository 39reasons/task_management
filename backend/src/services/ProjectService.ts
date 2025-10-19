import type { Project, Task, TeamRole, User, WorkItemType, TaskKind } from "../../../shared/types.js";
import { DEFAULT_BOARD_WORKFLOW_TYPE } from "../../../shared/types.js";
import { query } from "../db/index.js";

const PROJECT_FIELDS = `
  p.id,
  p.name,
  p.description,
  p.created_at,
  p.updated_at,
  p.is_public,
  p.position,
  p.created_by
`;

const PROJECT_RETURNING_FIELDS = `
  id,
  name,
  description,
  created_at,
  updated_at,
  is_public,
  position,
  created_by
`;

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  is_public: boolean;
  position: number | null;
  created_by: string | null;
};

const ROLE_PRIORITY: Record<TeamRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

function normalizeTimestamp(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function mapProjectRow(row: ProjectRow, viewerRole: TeamRole | null): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    created_at: normalizeTimestamp(row.created_at),
    updated_at: normalizeTimestamp(row.updated_at),
    is_public: row.is_public,
    position: row.position,
    created_by: row.created_by ?? null,
    viewer_role: viewerRole,
    viewer_is_owner: viewerRole === "owner",
  };
}

function pickHigherRole(current: TeamRole | null, candidate: TeamRole | null): TeamRole | null {
  if (!candidate) return current;
  if (!current) return candidate;
  return ROLE_PRIORITY[candidate] > ROLE_PRIORITY[current] ? candidate : current;
}

async function getProjectRowById(id: string): Promise<ProjectRow | null> {
  const result = await query<ProjectRow>(
    `
    SELECT ${PROJECT_FIELDS}
    FROM projects p
    WHERE p.id = $1
    `,
    [id]
  );
  return result.rows[0] ?? null;
}

async function getProjectRole(project_id: string, user_id: string): Promise<TeamRole | null> {
  const result = await query<{ role: TeamRole }>(
    `
    SELECT role
    FROM user_projects
    WHERE project_id = $1
      AND user_id = $2
    LIMIT 1
    `,
    [project_id, user_id]
  );
  return result.rows[0]?.role ?? null;
}

async function getHighestTeamRole(project_id: string, user_id: string): Promise<TeamRole | null> {
  const result = await query<{ role: TeamRole }>(
    `
    SELECT tm.role
    FROM teams t
    JOIN team_members tm
      ON tm.team_id = t.id
     AND tm.user_id = $2
     AND tm.status = 'active'
    WHERE t.project_id = $1
    ORDER BY
      CASE tm.role
        WHEN 'owner' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'member' THEN 3
        WHEN 'viewer' THEN 4
        ELSE 5
      END
    LIMIT 1
    `,
    [project_id, user_id]
  );
  return result.rows[0]?.role ?? null;
}

async function assertProjectAccess(project_id: string, user_id: string): Promise<{
  row: ProjectRow;
  viewer_role: TeamRole | null;
}> {
  const row = await getProjectRowById(project_id);
  if (!row) {
    throw new Error("Project not found");
  }

  const [projectRole, teamRole] = await Promise.all([
    getProjectRole(project_id, user_id),
    getHighestTeamRole(project_id, user_id),
  ]);
  const viewerRole = pickHigherRole(projectRole, teamRole);

  if (!viewerRole && !row.is_public) {
    throw new Error("Project not found or not accessible");
  }

  return { row, viewer_role: viewerRole };
}

async function assertProjectPermission(
  project_id: string,
  user_id: string,
  allowedRoles: TeamRole[] = ["owner", "admin", "member"]
): Promise<{ row: ProjectRow; viewer_role: TeamRole }> {
  const { row, viewer_role } = await assertProjectAccess(project_id, user_id);
  if (!viewer_role) {
    throw new Error("Project not found or not accessible");
  }
  if (!allowedRoles.includes(viewer_role)) {
    throw new Error("Not authorized for this project");
  }
  return { row, viewer_role };
}

async function resolveTeamSlugCandidate(name: string): Promise<string> {
  const sanitize = (value: string) =>
    value
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `team-${Math.random().toString(36).slice(2, 10)}`;

  const base = sanitize(name);
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await query<{ id: string }>(
      `
      SELECT id
      FROM teams
      WHERE slug = $1
      LIMIT 1
      `,
      [candidate]
    );
    if (existing.rowCount === 0) {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function defaultTeamName(projectName: string): string {
  const trimmed = projectName.trim();
  if (!trimmed) {
    return "Core Team";
  }
  if (trimmed.toLowerCase().includes("team")) {
    return trimmed;
  }
  return `${trimmed} Team`;
}

export async function getProjects(user_id: string): Promise<Project[]> {
  const direct = await query<ProjectRow & { project_role: TeamRole | null }>(
    `
    SELECT
      ${PROJECT_FIELDS},
      up.role AS project_role
    FROM projects p
    JOIN user_projects up
      ON up.project_id = p.id
     AND up.user_id = $1
    `,
    [user_id]
  );

  const teamBased = await query<ProjectRow & { team_role: TeamRole }>(
    `
    SELECT DISTINCT
      ${PROJECT_FIELDS},
      tm.role AS team_role
    FROM projects p
    JOIN teams t
      ON t.project_id = p.id
    JOIN team_members tm
      ON tm.team_id = t.id
     AND tm.user_id = $1
     AND tm.status = 'active'
    `,
    [user_id]
  );

  const projects = new Map<
    string,
    {
      row: ProjectRow;
      project_role: TeamRole | null;
      team_role: TeamRole | null;
    }
  >();

  for (const row of direct.rows) {
    projects.set(row.id, {
      row,
      project_role: row.project_role ?? null,
      team_role: null,
    });
  }

  for (const row of teamBased.rows) {
    const existing = projects.get(row.id);
    if (existing) {
      existing.team_role = pickHigherRole(existing.team_role, row.team_role ?? null);
      continue;
    }
    projects.set(row.id, {
      row,
      project_role: null,
      team_role: row.team_role ?? null,
    });
  }

  const mapped = Array.from(projects.values()).map(({ row, project_role, team_role }) =>
    mapProjectRow(row, pickHigherRole(project_role, team_role))
  );

  mapped.sort((a, b) => {
    const posA = a.position ?? Number.MAX_SAFE_INTEGER;
    const posB = b.position ?? Number.MAX_SAFE_INTEGER;
    if (posA !== posB) {
      return posA - posB;
    }
    const dateA = a.created_at ? Date.parse(a.created_at) : 0;
    const dateB = b.created_at ? Date.parse(b.created_at) : 0;
    return dateB - dateA;
  });

  return mapped;
}

export async function getProjectById(id: string, user_id: string): Promise<Project> {
  const { row, viewer_role } = await assertProjectAccess(id, user_id);

  const taskRes = await query<{
    id: string;
    type: WorkItemType;
    task_kind: TaskKind | null;
    title: string;
    description: string | null;
    due_date: string | null;
    priority: string | null;
    estimate: number | null;
    status: string;
    stage_id: string | null;
    backlog_id: string | null;
    sprint_id: string | null;
    project_id: string;
    team_id: string;
    position: number | null;
    assignee_id: string | null;
    created_at: Date | string | null;
    updated_at: Date | string | null;
  }>(
    `
    SELECT
      wi.id,
      wi.type,
      wi.task_kind,
      wi.title,
      wi.description,
      to_char(wi.due_date, 'YYYY-MM-DD') AS due_date,
      wi.priority,
      wi.estimate,
      wi.status,
      wi.stage_id,
      wi.backlog_id,
      wi.sprint_id,
      wi.project_id,
      wi.team_id,
      wi.position,
      wi.assignee_id,
      wi.created_at,
      wi.updated_at
    FROM work_items wi
    WHERE wi.project_id = $1
      AND wi.type IN ('TASK', 'BUG')
    ORDER BY wi.created_at ASC
    `,
    [id]
  );

  return {
    ...mapProjectRow(row, viewer_role),
    tasks: taskRes.rows.map((task) => ({
      id: task.id,
      type: task.type,
      task_kind: task.task_kind ?? "GENERAL",
      title: task.title,
      description: task.description ?? null,
      due_date: task.due_date,
      priority: (task.priority ?? null) as Task["priority"],
      estimate: task.estimate ?? null,
      status: task.status as Task["status"],
      stage_id: task.stage_id ?? null,
      backlog_id: task.backlog_id ?? null,
      sprint_id: task.sprint_id ?? null,
      project_id: task.project_id,
      team_id: task.team_id,
      position: task.position ?? undefined,
      assignee_id: task.assignee_id ?? null,
      assignee: null,
      stage: null,
      sprint: null,
      created_at: normalizeTimestamp(task.created_at),
      updated_at: normalizeTimestamp(task.updated_at),
      tags: [],
      history: [],
      children: [],
      bug_details: null,
      issue_details: null,
    })),
  };
}

export async function userHasProjectAccess(project_id: string, user_id: string): Promise<boolean> {
  const row = await getProjectRowById(project_id);
  if (!row) {
    return false;
  }
  if (row.is_public) {
    return true;
  }
  const [projectRole, teamRole] = await Promise.all([
    getProjectRole(project_id, user_id),
    getHighestTeamRole(project_id, user_id),
  ]);
  return Boolean(projectRole ?? teamRole ?? null);
}

export async function getProjectMembers(project_id: string): Promise<User[]> {
  const result = await query<User & { source: string }>(
    `
    WITH project_members AS (
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.username,
        u.avatar_color,
        'project'::text AS source
      FROM user_projects up
      JOIN users u ON u.id = up.user_id
      WHERE up.project_id = $1
    ),
    team_memberships AS (
      SELECT DISTINCT
        u.id,
        u.first_name,
        u.last_name,
        u.username,
        u.avatar_color,
        'team'::text AS source
      FROM teams t
      JOIN team_members tm
        ON tm.team_id = t.id
       AND tm.status = 'active'
      JOIN users u
        ON u.id = tm.user_id
      WHERE t.project_id = $1
    )
    SELECT *
    FROM (
      SELECT * FROM project_members
      UNION
      SELECT * FROM team_memberships
    ) members
    `,
    [project_id]
  );

  const unique = new Map<string, User>();
  for (const member of result.rows) {
    if (!unique.has(member.id)) {
      unique.set(member.id, {
        id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
        username: member.username,
        avatar_color: member.avatar_color ?? null,
      });
    }
  }
  return Array.from(unique.values());
}

export async function addProject(
  name: string,
  description: string | null,
  is_public: boolean,
  user_id: string
): Promise<Project> {
  const result = await query<ProjectRow>(
    `
    INSERT INTO projects (name, description, is_public, position, created_by)
    VALUES (
      $1,
      $2,
      $3,
      COALESCE((SELECT MAX(position) FROM projects), 0) + 1,
      $4
    )
    RETURNING ${PROJECT_RETURNING_FIELDS}
    `,
    [name.trim(), description ?? null, is_public, user_id]
  );

  const projectRow = result.rows[0];
  const project_id = projectRow.id;

  await query(
    `
    INSERT INTO user_projects (user_id, project_id, role)
    VALUES ($1, $2, 'owner')
    ON CONFLICT (user_id, project_id) DO UPDATE
      SET role = 'owner'
    `,
    [user_id, project_id]
  );

  const teamName = defaultTeamName(name);
  const teamSlug = await resolveTeamSlugCandidate(teamName);

  const teamResult = await query<{ id: string }>(
    `
    INSERT INTO teams (project_id, name, description, slug, created_by)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
    `,
    [project_id, teamName, description ?? null, teamSlug, user_id]
  );

  const teamId = teamResult.rows[0].id;

  await query(
    `
    INSERT INTO team_members (team_id, user_id, role, status)
    VALUES ($1, $2, 'owner', 'active')
    ON CONFLICT (team_id, user_id) DO UPDATE
      SET role = 'owner',
          status = 'active',
          updated_at = now()
    `,
    [teamId, user_id]
  );

  await query(
    `
    INSERT INTO workflows (project_id, team_id, name, workflow_type)
    VALUES ($1, $2, $3, $4)
    `,
    [project_id, teamId, `${name.trim() || "Project"} Board`, DEFAULT_BOARD_WORKFLOW_TYPE]
  );

  return mapProjectRow(projectRow, "owner");
}

export async function updateProject(
  id: string,
  user_id: string,
  name?: string,
  description?: string,
  is_public?: boolean
): Promise<Project> {
  await assertProjectPermission(id, user_id, ["owner", "admin"]);

  const result = await query<ProjectRow>(
    `
    UPDATE projects
    SET
      name = COALESCE($2, name),
      description = COALESCE($3, description),
      is_public = COALESCE($4, is_public),
      updated_at = now()
    WHERE id = $1
    RETURNING ${PROJECT_RETURNING_FIELDS}
    `,
    [
      id,
      typeof name === "string" ? name.trim() || null : null,
      description ?? null,
      typeof is_public === "boolean" ? is_public : null,
    ]
  );

  if (result.rowCount === 0) {
    throw new Error("Project not found");
  }

  const projectRole = await getProjectRole(id, user_id);
  const teamRole = await getHighestTeamRole(id, user_id);
  const viewerRole = pickHigherRole(projectRole, teamRole) ?? "owner";

  return mapProjectRow(result.rows[0], viewerRole);
}

export async function deleteProject(id: string, user_id: string): Promise<boolean> {
  await assertProjectPermission(id, user_id, ["owner"]);
  const result = await query(`DELETE FROM projects WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function reorderProjects(project_ids: string[], user_id: string): Promise<boolean> {
  if (project_ids.length === 0) {
    return true;
  }

  const projects = await query<{ id: string; role: TeamRole | null }>(
    `
    SELECT up.project_id AS id, up.role
    FROM user_projects up
    WHERE up.user_id = $1
      AND up.project_id = ANY($2::uuid[])
    `,
    [user_id, project_ids]
  );

  const allowed = new Set(
    projects.rows
      .filter((row) => row.role === "owner" || row.role === "admin")
      .map((row) => row.id)
  );

  const updates: Array<Promise<unknown>> = [];
  let position = 1;
  for (const projectId of project_ids) {
    if (!allowed.has(projectId)) {
      continue;
    }
    updates.push(
      query(
        `
        UPDATE projects
        SET position = $2, updated_at = now()
        WHERE id = $1
        `,
        [projectId, position]
      )
    );
    position += 1;
  }

  await Promise.all(updates);
  return true;
}

export async function leaveProject(project_id: string, user_id: string): Promise<boolean> {
  const projectRole = await getProjectRole(project_id, user_id);
  if (!projectRole) {
    throw new Error("You are not a collaborator on this project");
  }
  if (projectRole === "owner") {
    const ownerCount = await query<{ count: number }>(
      `
      SELECT COUNT(*)::int AS count
      FROM user_projects
      WHERE project_id = $1
        AND role = 'owner'
      `,
      [project_id]
    );
    if ((ownerCount.rows[0]?.count ?? 0) <= 1) {
      throw new Error("Transfer ownership before leaving the project");
    }
  }

  await query(
    `
    DELETE FROM user_projects
    WHERE project_id = $1
      AND user_id = $2
    `,
    [project_id, user_id]
  );

  await query(
    `
    DELETE FROM team_members
    WHERE user_id = $2
      AND team_id IN (
        SELECT id
        FROM teams
        WHERE project_id = $1
      )
    `,
    [project_id, user_id]
  );

  await query(
    `
    UPDATE tasks
    SET assignee_id = NULL,
        updated_at = now()
    WHERE project_id = $1
      AND assignee_id = $2
    `,
    [project_id, user_id]
  );

  return true;
}

export async function removeProjectMember(
  project_id: string,
  target_user_id: string,
  acting_user_id: string
): Promise<boolean> {
  const { viewer_role } = await assertProjectPermission(project_id, acting_user_id, ["owner", "admin"]);
  const targetRole = await getProjectRole(project_id, target_user_id);

  if (!targetRole) {
    throw new Error("User is not a member of this project");
  }

  if (targetRole === "owner") {
    if (viewer_role !== "owner") {
      throw new Error("Only owners can remove another owner");
    }
    const owners = await query<{ count: number }>(
      `
      SELECT COUNT(*)::int AS count
      FROM user_projects
      WHERE project_id = $1
        AND role = 'owner'
      `,
      [project_id]
    );
    if ((owners.rows[0]?.count ?? 0) <= 1) {
      throw new Error("Cannot remove the last owner from the project");
    }
  }

  await query(
    `
    DELETE FROM user_projects
    WHERE project_id = $1
      AND user_id = $2
    `,
    [project_id, target_user_id]
  );

  await query(
    `
    DELETE FROM team_members
    WHERE user_id = $2
      AND team_id IN (
        SELECT id
        FROM teams
        WHERE project_id = $1
      )
    `,
    [project_id, target_user_id]
  );

  await query(
    `
    UPDATE tasks
    SET assignee_id = NULL,
        updated_at = now()
    WHERE project_id = $1
      AND assignee_id = $2
    `,
    [project_id, target_user_id]
  );

  return true;
}
