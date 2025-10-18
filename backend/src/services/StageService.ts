import { query } from "../db/index.js";
import type { Stage } from "../../../shared/types.js";
import { publishTaskBoardEvent, type TaskBoardEvent } from "../events/taskBoardPubSub.js";

const STAGE_NAME_MAX_LENGTH = 512;

function sanitizeStageName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Stage name is required.");
  }
  if (trimmed.length > STAGE_NAME_MAX_LENGTH) {
    throw new Error(`Stage name cannot exceed ${STAGE_NAME_MAX_LENGTH} characters.`);
  }
  return trimmed;
}

export async function getStagesByBoard(board_id: string): Promise<Stage[]> {
  const result = await query<{
    id: string;
    name: string;
    position: number;
    board_id: string;
  }>(
    `
    SELECT id, name, position, workflow_id AS board_id
    FROM stages
    WHERE workflow_id = $1
    ORDER BY position ASC
    `,
    [board_id]
  );

  return result.rows.map((row) => ({ ...row, tasks: [] }));
}

async function broadcastStageEvent(event: Omit<TaskBoardEvent, "timestamp">): Promise<void> {
  await publishTaskBoardEvent({
    ...event,
    timestamp: new Date().toISOString(),
  });
}

async function getProjectContextForBoard(
  board_id: string
): Promise<{ project_id: string; team_id: string } | null> {
  const result = await query<{ project_id: string; team_id: string }>(
    `
    SELECT w.project_id, w.team_id
    FROM workflows w
    WHERE w.id = $1
    `,
    [board_id]
  );
  const row = result.rows[0];
  return row ? { project_id: row.project_id, team_id: row.team_id } : null;
}

export async function addStage(
  board_id: string,
  name: string,
  position?: number | null,
  options?: { origin?: string | null }
): Promise<Stage> {
  const sanitizedName = sanitizeStageName(name);

  const result = await query<{
    id: string;
    name: string;
    position: number;
    board_id: string;
  }>(
    `
    INSERT INTO stages (workflow_id, name, position)
    VALUES (
      $1,
      $2,
      COALESCE(
        $3,
        (
          SELECT COALESCE(MAX(position), 0) + 1
          FROM stages
          WHERE workflow_id = $1
        )
      )
    )
    RETURNING id, name, position, workflow_id AS board_id
    `,
    [board_id, sanitizedName, position ?? null]
  );

  const stage = { ...result.rows[0], tasks: [] };

  const projectContext = await getProjectContextForBoard(board_id);
  if (projectContext) {
    await broadcastStageEvent({
      action: "STAGE_CREATED",
      project_id: projectContext.project_id,
      team_id: projectContext.team_id,
      board_id,
      stage_id: stage.id,
      origin: options?.origin ?? null,
    });
  }

  return stage;
}

export async function updateStage(
  id: string,
  name?: string,
  position?: number,
  options?: { origin?: string | null }
): Promise<Stage> {
  const sanitizedName = name === undefined ? null : sanitizeStageName(name);

  const result = await query<{
    id: string;
    name: string;
    position: number;
    board_id: string;
  }>(
    `
    UPDATE stages
    SET name = COALESCE($2, name),
        position = COALESCE($3, position),
        updated_at = now()
    WHERE id = $1
    RETURNING id, name, position, workflow_id AS board_id
    `,
    [id, sanitizedName, position ?? null]
  );

  if (result.rowCount === 0) {
    throw new Error("Stage not found");
  }

  const stage = { ...result.rows[0], tasks: [] };
  const projectContext = await getProjectContextForBoard(stage.board_id);
  if (projectContext) {
    await broadcastStageEvent({
      action: "STAGE_UPDATED",
      project_id: projectContext.project_id,
      team_id: projectContext.team_id,
      board_id: stage.board_id,
      stage_id: stage.id,
      origin: options?.origin ?? null,
    });
  }

  return stage;
}

export async function deleteStage(id: string, options?: { origin?: string | null }): Promise<boolean> {
  const existing = await query<{ board_id: string }>(
    `SELECT workflow_id AS board_id FROM stages WHERE id = $1`,
    [id]
  );
  const boardId = existing.rows[0]?.board_id ?? null;

  const result = await query(`DELETE FROM stages WHERE id = $1`, [id]);

  const deleted = (result.rowCount ?? 0) > 0;

  if (deleted && boardId) {
    const projectContext = await getProjectContextForBoard(boardId);
    if (projectContext) {
      await broadcastStageEvent({
        action: "STAGE_DELETED",
        project_id: projectContext.project_id,
        team_id: projectContext.team_id,
        board_id: boardId,
        stage_id: id,
        origin: options?.origin ?? null,
      });
    }
  }

  return deleted;
}

export async function reorderStages(
  board_id: string,
  stage_ids: string[],
  options?: { origin?: string | null }
): Promise<void> {
  if (stage_ids.length === 0) {
    return;
  }

  await query(
    `
    WITH ordered AS (
      SELECT value AS id, ordinality - 1 AS position
      FROM unnest($2::uuid[]) WITH ORDINALITY AS u(value, ordinality)
    )
    UPDATE stages s
    SET position = ordered.position,
        updated_at = now()
    FROM ordered
    WHERE s.id = ordered.id AND s.workflow_id = $1
    `,
    [board_id, stage_ids]
  );

  const projectContext = await getProjectContextForBoard(board_id);
  if (projectContext) {
    await broadcastStageEvent({
      action: "STAGES_REORDERED",
      project_id: projectContext.project_id,
      team_id: projectContext.team_id,
      board_id,
      stage_ids,
      origin: options?.origin ?? null,
    });
  }
}

export async function getStageById(id: string): Promise<Stage | null> {
  const result = await query<{
    id: string;
    name: string;
    position: number;
    board_id: string;
  }>(
    `
    SELECT id, name, position, workflow_id AS board_id
    FROM stages
    WHERE id = $1
    `,
    [id]
  );

  if (result.rowCount === 0) return null;
  return { ...result.rows[0], tasks: [] };
}
