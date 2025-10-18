import type { Backlog } from "../../../shared/types.js";
import * as TeamService from "./TeamService.js";
import { query } from "../db/index.js";

const BACKLOG_NAME_MAX_LENGTH = 120;

function normalizeTimestamp(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function sanitizeBacklogName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Backlog name is required.");
  }
  if (trimmed.length > BACKLOG_NAME_MAX_LENGTH) {
    throw new Error(`Backlog name cannot exceed ${BACKLOG_NAME_MAX_LENGTH} characters.`);
  }
  return trimmed;
}

type BacklogRow = {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  position: number | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
};

function mapBacklogRow(row: BacklogRow): Backlog {
  return {
    id: row.id,
    team_id: row.team_id,
    name: row.name,
    description: row.description ?? undefined,
    position: row.position ?? undefined,
    created_at: normalizeTimestamp(row.created_at),
    updated_at: normalizeTimestamp(row.updated_at),
  };
}

export async function getBacklogsForProject(project_id: string): Promise<Backlog[]> {
  const result = await query<BacklogRow>(
    `
      SELECT b.id, b.team_id, b.name, b.description, b.position, b.created_at, b.updated_at
      FROM backlogs b
      JOIN teams t ON t.id = b.team_id
      WHERE t.project_id = $1
      ORDER BY b.position NULLS LAST, b.created_at ASC
    `,
    [project_id]
  );

  return result.rows.map(mapBacklogRow);
}


export async function getBacklogsForTeam(team_id: string, user_id: string): Promise<Backlog[]> {
  const membership = await TeamService.getTeamMembership(team_id, user_id);
  if (!membership) {
    throw new Error("Not authorized to view backlogs for this team");
  }
  const result = await query<BacklogRow>(
    `
      SELECT id, team_id, name, description, position, created_at, updated_at
      FROM backlogs
      WHERE team_id = $1
      ORDER BY position NULLS LAST, created_at ASC
    `,
    [team_id]
  );
  return result.rows.map(mapBacklogRow);
}

export async function createBacklog(
  team_id: string,
  user_id: string,
  name: string,
  description: string | null,
  position: number | null
): Promise<Backlog> {
  const membership = await TeamService.getTeamMembership(team_id, user_id);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    throw new Error("Not authorized to create backlogs for this team");
  }
  const sanitizedName = sanitizeBacklogName(name);
  const result = await query<BacklogRow>(
    `
      INSERT INTO backlogs (team_id, name, description, position)
      VALUES ($1, $2, $3, COALESCE($4, (SELECT COALESCE(MAX(position) + 1, 1) FROM backlogs WHERE team_id = $1)))
      RETURNING id, team_id, name, description, position, created_at, updated_at
    `,
    [team_id, sanitizedName, description ?? null, position]
  );
  return mapBacklogRow(result.rows[0]);
}

export async function updateBacklog(
  id: string,
  user_id: string,
  name?: string,
  description?: string | null,
  position?: number | null
): Promise<Backlog> {
  const existing = await query<{ team_id: string }>(`SELECT team_id FROM backlogs WHERE id = $1`, [id]);
  if (existing.rowCount === 0) {
    throw new Error("Backlog not found");
  }
  const team_id = existing.rows[0].team_id;
  const membership = await TeamService.getTeamMembership(team_id, user_id);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    throw new Error("Not authorized to update this backlog");
  }
  const sanitizedName = name === undefined ? null : sanitizeBacklogName(name);
  const result = await query<BacklogRow>(
    `
      UPDATE backlogs
      SET
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        position = COALESCE($4, position),
        updated_at = now()
      WHERE id = $1
      RETURNING id, team_id, name, description, position, created_at, updated_at
    `,
    [id, sanitizedName, description ?? null, position ?? null]
  );
  if (result.rowCount === 0) {
    throw new Error("Backlog not found");
  }
  return mapBacklogRow(result.rows[0]);
}

export async function deleteBacklog(id: string, user_id: string): Promise<boolean> {
  const existing = await query<{ team_id: string }>(`SELECT team_id FROM backlogs WHERE id = $1`, [id]);
  if (existing.rowCount === 0) {
    throw new Error("Backlog not found");
  }
  const team_id = existing.rows[0].team_id;
  const membership = await TeamService.getTeamMembership(team_id, user_id);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    throw new Error("Not authorized to delete this backlog");
  }
  const result = await query(`DELETE FROM backlogs WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
