import type { BacklogTask } from "../../../shared/types.js";
import { query } from "../db/index.js";
import * as TeamService from "./TeamService.js";

const BACKLOG_TASK_TITLE_MAX_LENGTH = 512;
const VALID_STATUSES: ReadonlySet<BacklogTask["status"]> = new Set(["new", "active", "closed"]);

type BacklogTaskRow = {
  id: string;
  backlog_id: string;
  title: string;
  description: string | null;
  status: string;
  position: number;
  created_at: Date | string | null;
  updated_at: Date | string | null;
};

type BacklogTaskContextRow = {
  backlog_id: string;
  team_id: string;
};

function normalizeTimestamp(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function sanitizeTitle(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Task title is required.");
  }
  if (trimmed.length > BACKLOG_TASK_TITLE_MAX_LENGTH) {
    throw new Error(`Task title cannot exceed ${BACKLOG_TASK_TITLE_MAX_LENGTH} characters.`);
  }
  return trimmed;
}

function sanitizeStatus(input?: string | null): BacklogTask["status"] {
  const normalized = (input ?? "").trim().toLowerCase();
  if (!normalized) {
    return "new";
  }
  if (!VALID_STATUSES.has(normalized as BacklogTask["status"])) {
    throw new Error("Invalid task status.");
  }
  return normalized as BacklogTask["status"];
}

function mapRow(row: BacklogTaskRow): BacklogTask {
  return {
    id: row.id,
    backlog_id: row.backlog_id,
    title: row.title,
    description: row.description ?? undefined,
    status: sanitizeStatus(row.status),
    position: row.position,
    created_at: normalizeTimestamp(row.created_at),
    updated_at: normalizeTimestamp(row.updated_at),
  };
}

async function getBacklogContextByBacklogId(backlog_id: string): Promise<{ team_id: string }> {
  const result = await query<{ team_id: string }>(
    `SELECT team_id FROM backlogs WHERE id = $1`,
    [backlog_id]
  );
  if (result.rowCount === 0) {
    throw new Error("Backlog not found");
  }
  return { team_id: result.rows[0].team_id };
}

async function getBacklogContextByTaskId(task_id: string): Promise<BacklogTaskContextRow> {
  const result = await query<BacklogTaskContextRow>(
    `
      SELECT bt.backlog_id, b.team_id
      FROM backlog_tasks bt
      JOIN backlogs b ON b.id = bt.backlog_id
      WHERE bt.id = $1
    `,
    [task_id]
  );
  if (result.rowCount === 0) {
    throw new Error("Backlog task not found");
  }
  return result.rows[0];
}

async function assertBacklogManageAccess(team_id: string, user_id: string): Promise<void> {
  const membership = await TeamService.getTeamMembership(team_id, user_id);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    throw new Error("Not authorized to manage backlog tasks for this team");
  }
}

export async function getTasksForBacklog(backlog_id: string): Promise<BacklogTask[]> {
  const result = await query<BacklogTaskRow>(
    `
      SELECT id, backlog_id, title, description, status, position, created_at, updated_at
      FROM backlog_tasks
      WHERE backlog_id = $1
      ORDER BY position ASC, created_at ASC
    `,
    [backlog_id]
  );
  return result.rows.map(mapRow);
}

export async function createBacklogTask(
  backlog_id: string,
  user_id: string,
  title: string,
  description?: string | null,
  status?: string | null
): Promise<BacklogTask> {
  const { team_id } = await getBacklogContextByBacklogId(backlog_id);
  await assertBacklogManageAccess(team_id, user_id);

  const sanitizedTitle = sanitizeTitle(title);
  const sanitizedStatus = sanitizeStatus(status);

  const result = await query<BacklogTaskRow>(
    `
      WITH next_position AS (
        SELECT COALESCE(MAX(position) + 1, 0) AS pos
        FROM backlog_tasks
        WHERE backlog_id = $1
      )
      INSERT INTO backlog_tasks (backlog_id, title, description, status, position)
      VALUES ($1, $2, $3, $4, (SELECT pos FROM next_position))
      RETURNING id, backlog_id, title, description, status, position, created_at, updated_at
    `,
    [backlog_id, sanitizedTitle, description ?? null, sanitizedStatus]
  );

  return mapRow(result.rows[0]);
}

export async function updateBacklogTask(
  id: string,
  user_id: string,
  updates: {
    title?: string;
    description?: string | null;
    status?: string | null;
    position?: number | null;
  }
): Promise<BacklogTask> {
  const context = await getBacklogContextByTaskId(id);
  await assertBacklogManageAccess(context.team_id, user_id);

  const sanitizedTitle = updates.title === undefined ? null : sanitizeTitle(updates.title);
  const sanitizedStatus =
    updates.status === undefined ? null : sanitizeStatus(updates.status);

  const result = await query<BacklogTaskRow>(
    `
      UPDATE backlog_tasks
      SET
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        status = COALESCE($4, status),
        position = COALESCE($5, position),
        updated_at = now()
      WHERE id = $1
      RETURNING id, backlog_id, title, description, status, position, created_at, updated_at
    `,
    [id, sanitizedTitle, updates.description ?? null, sanitizedStatus, updates.position ?? null]
  );

  if (result.rowCount === 0) {
    throw new Error("Backlog task not found");
  }

  return mapRow(result.rows[0]);
}

export async function deleteBacklogTask(id: string, user_id: string): Promise<boolean> {
  const context = await getBacklogContextByTaskId(id);
  await assertBacklogManageAccess(context.team_id, user_id);

  const result = await query(`DELETE FROM backlog_tasks WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
