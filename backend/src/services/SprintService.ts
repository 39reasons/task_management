import { query } from "../db/index.js";
import type { Sprint } from "../../../shared/types.js";

function normalizeDate(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

type SprintRow = {
  id: string;
  project_id: string;
  team_id: string;
  name: string;
  goal: string | null;
  start_date: Date | string | null;
  end_date: Date | string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
};

function mapRow(row: SprintRow): Sprint {
  return {
    id: row.id,
    project_id: row.project_id,
     team_id: row.team_id,
    name: row.name,
    goal: row.goal ?? undefined,
    start_date: row.start_date ? normalizeDate(row.start_date) : undefined,
    end_date: row.end_date ? normalizeDate(row.end_date) : undefined,
    created_at: normalizeDate(row.created_at),
    updated_at: normalizeDate(row.updated_at),
  };
}

export async function getSprintsByFilter({
  project_id,
  team_id,
}: {
  project_id?: string | null;
  team_id?: string | null;
}): Promise<Sprint[]> {
  if (!project_id && !team_id) {
    throw new Error("Provide a project or team identifier to list sprints.");
  }

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (project_id) {
    params.push(project_id);
    conditions.push(`project_id = $${params.length}`);
  }

  if (team_id) {
    params.push(team_id);
    conditions.push(`team_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query<SprintRow>(
    `
      SELECT id, project_id, team_id, name, goal, start_date, end_date, created_at, updated_at
      FROM sprints
      ${whereClause}
      ORDER BY start_date NULLS FIRST, created_at ASC
    `,
    params
  );
  return result.rows.map(mapRow);
}

export async function getSprintById(id: string): Promise<Sprint | null> {
  const result = await query<SprintRow>(
    `
      SELECT id, project_id, team_id, name, goal, start_date, end_date, created_at, updated_at
      FROM sprints
      WHERE id = $1
    `,
    [id]
  );
  if (result.rowCount === 0) {
    return null;
  }
  return mapRow(result.rows[0]);
}
