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
    name: row.name,
    goal: row.goal ?? undefined,
    start_date: row.start_date ? normalizeDate(row.start_date) : undefined,
    end_date: row.end_date ? normalizeDate(row.end_date) : undefined,
    created_at: normalizeDate(row.created_at),
    updated_at: normalizeDate(row.updated_at),
  };
}

export async function getSprintsByProject(project_id: string): Promise<Sprint[]> {
  const result = await query<SprintRow>(
    `
      SELECT id, project_id, name, goal, start_date, end_date, created_at, updated_at
      FROM sprints
      WHERE project_id = $1
      ORDER BY start_date NULLS FIRST, created_at ASC
    `,
    [project_id]
  );
  return result.rows.map(mapRow);
}

export async function getSprintById(id: string): Promise<Sprint | null> {
  const result = await query<SprintRow>(
    `
      SELECT id, project_id, name, goal, start_date, end_date, created_at, updated_at
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
