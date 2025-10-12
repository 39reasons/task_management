import { query } from "../db/index.js";
import type { Team, TeamMember, TeamRole } from "../../../shared/types.js";

const TEAM_NAME_MAX_LENGTH = 120;

function normalizeTimestamp(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function sanitizeTeamName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Team name is required.");
  }
  if (trimmed.length > TEAM_NAME_MAX_LENGTH) {
    throw new Error(`Team name cannot exceed ${TEAM_NAME_MAX_LENGTH} characters.`);
  }
  return trimmed;
}

function generateSlugCandidate(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `team-${Math.random().toString(36).slice(2, 10)}`;
}

async function resolveUniqueSlug(baseName: string): Promise<string> {
  const base = generateSlugCandidate(baseName);
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await query<{ id: string }>(
      `SELECT id FROM teams WHERE slug = $1 LIMIT 1`,
      [candidate]
    );
    if (existing.rowCount === 0) {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function mapTeamRow(row: any): Team {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    slug: row.slug,
    created_at: normalizeTimestamp(row.created_at),
    updated_at: normalizeTimestamp(row.updated_at),
    role: (row.role as TeamRole) ?? null,
    projects: [],
    members: [],
  };
}

function mapTeamMemberRow(row: any): TeamMember {
  return {
    team_id: row.team_id,
    user: {
      id: row.user_id,
      first_name: row.first_name,
      last_name: row.last_name,
      username: row.username,
      avatar_color: row.avatar_color ?? null,
    },
    role: row.role as TeamRole,
    status: (row.status as TeamMember["status"]) ?? "active",
    created_at: normalizeTimestamp(row.created_at),
    updated_at: normalizeTimestamp(row.updated_at),
  };
}

export async function getTeamsForUser(user_id: string): Promise<Team[]> {
  const result = await query(
    `
    SELECT
      t.id,
      t.name,
      t.description,
      t.slug,
      t.created_at,
      t.updated_at,
      tm.role
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.user_id = $1
      AND tm.status = 'active'
    ORDER BY t.created_at ASC
    `,
    [user_id]
  );

  return result.rows.map(mapTeamRow);
}

export async function getTeamById(id: string, user_id: string): Promise<Team> {
  const result = await query(
    `
    SELECT
      t.id,
      t.name,
      t.description,
      t.slug,
      t.created_at,
      t.updated_at,
      tm.role
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE t.id = $1
      AND tm.user_id = $2
      AND tm.status = 'active'
    `,
    [id, user_id]
  );

  if (result.rowCount === 0) {
    throw new Error("Team not found or not accessible");
  }

  return mapTeamRow(result.rows[0]);
}

export async function createTeam(
  name: string,
  description: string | null,
  user_id: string
): Promise<Team> {
  const sanitizedName = sanitizeTeamName(name);
  const slug = await resolveUniqueSlug(sanitizedName);

  const result = await query(
    `
    INSERT INTO teams (name, description, slug, created_by)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, description, slug, created_at, updated_at
    `,
    [sanitizedName, description, slug, user_id]
  );

  const team = mapTeamRow(result.rows[0]);

  await query(
    `
    INSERT INTO team_members (team_id, user_id, role, status)
    VALUES ($1, $2, 'owner', 'active')
    ON CONFLICT (team_id, user_id) DO UPDATE
      SET role = 'owner',
          status = 'active',
          updated_at = now()
    `,
    [team.id, user_id]
  );

  return { ...team, role: "owner" };
}

export async function updateTeam(
  id: string,
  user_id: string,
  name?: string,
  description?: string
): Promise<Team> {
  const membership = await getTeamMembership(id, user_id);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    throw new Error("Not authorized to update this team");
  }

  const sanitizedName = name === undefined ? null : sanitizeTeamName(name);

  const result = await query(
    `
    UPDATE teams
    SET
      name = COALESCE($2, name),
      description = COALESCE($3, description),
      updated_at = now()
    WHERE id = $1
    RETURNING id, name, description, slug, created_at, updated_at
    `,
    [id, sanitizedName, description ?? null]
  );

  if (result.rowCount === 0) {
    throw new Error("Team not found");
  }

  const team = mapTeamRow(result.rows[0]);
  return { ...team, role: membership.role };
}

export async function deleteTeam(id: string, user_id: string): Promise<boolean> {
  const membership = await getTeamMembership(id, user_id);
  if (!membership || membership.role !== "owner") {
    throw new Error("Not authorized to delete this team");
  }

  const result = await query(`DELETE FROM teams WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function getTeamMembership(
  team_id: string,
  user_id: string
): Promise<{ role: TeamRole } | null> {
  const result = await query<{ role: TeamRole }>(
    `
    SELECT role
    FROM team_members
    WHERE team_id = $1
      AND user_id = $2
      AND status = 'active'
    `,
    [team_id, user_id]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return { role: result.rows[0].role };
}

export async function getTeamMembers(team_id: string): Promise<TeamMember[]> {
  const result = await query(
    `
    SELECT
      tm.team_id,
      tm.user_id,
      tm.role,
      tm.status,
      tm.created_at,
      tm.updated_at,
      u.first_name,
      u.last_name,
      u.username,
      u.avatar_color
    FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = $1
      AND tm.status = 'active'
    ORDER BY u.first_name ASC, u.last_name ASC
    `,
    [team_id]
  );

  return result.rows.map(mapTeamMemberRow);
}
