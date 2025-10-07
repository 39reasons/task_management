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

export async function getStagesByWorkflow(workflow_id: string): Promise<Stage[]> {
  const result = await query<Stage>(
    `
    SELECT id, name, position, workflow_id
    FROM stages
    WHERE workflow_id = $1
    ORDER BY position ASC
    `,
    [workflow_id]
  );

  return result.rows.map((row) => ({ ...row, tasks: [] }));
}

async function broadcastStageEvent(event: Omit<TaskBoardEvent, "timestamp">): Promise<void> {
  await publishTaskBoardEvent({
    ...event,
    timestamp: new Date().toISOString(),
  });
}

async function getProjectIdForWorkflow(workflow_id: string): Promise<string | null> {
  const result = await query<{ project_id: string }>(
    `SELECT project_id FROM workflows WHERE id = $1`,
    [workflow_id]
  );
  return result.rows[0]?.project_id ?? null;
}

export async function addStage(
  workflow_id: string,
  name: string,
  position?: number | null,
  options?: { origin?: string | null }
): Promise<Stage> {
  const sanitizedName = sanitizeStageName(name);

  const result = await query<Stage>(
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
    RETURNING id, name, position, workflow_id
    `,
    [workflow_id, sanitizedName, position ?? null]
  );

  const stage = { ...result.rows[0], tasks: [] };

  const projectId = await getProjectIdForWorkflow(workflow_id);
  if (projectId) {
    await broadcastStageEvent({
      action: "STAGE_CREATED",
      project_id: projectId,
      workflow_id,
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

  const result = await query<Stage>(
    `
    UPDATE stages
    SET name = COALESCE($2, name),
        position = COALESCE($3, position),
        updated_at = now()
    WHERE id = $1
    RETURNING id, name, position, workflow_id
    `,
    [id, sanitizedName, position ?? null]
  );

  if (result.rowCount === 0) {
    throw new Error("Stage not found");
  }

  const stage = { ...result.rows[0], tasks: [] };
  const projectId = await getProjectIdForWorkflow(stage.workflow_id);
  if (projectId) {
    await broadcastStageEvent({
      action: "STAGE_UPDATED",
      project_id: projectId,
      workflow_id: stage.workflow_id,
      stage_id: stage.id,
      origin: options?.origin ?? null,
    });
  }

  return stage;
}

export async function deleteStage(id: string, options?: { origin?: string | null }): Promise<boolean> {
  const existing = await query<{ workflow_id: string }>(
    `SELECT workflow_id FROM stages WHERE id = $1`,
    [id]
  );
  const workflowId = existing.rows[0]?.workflow_id ?? null;

  const result = await query(`DELETE FROM stages WHERE id = $1`, [id]);

  const deleted = (result.rowCount ?? 0) > 0;

  if (deleted && workflowId) {
    const projectId = await getProjectIdForWorkflow(workflowId);
    if (projectId) {
      await broadcastStageEvent({
        action: "STAGE_DELETED",
        project_id: projectId,
        workflow_id: workflowId,
        stage_id: id,
        origin: options?.origin ?? null,
      });
    }
  }

  return deleted;
}

export async function reorderStages(
  workflow_id: string,
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
    [workflow_id, stage_ids]
  );

  const projectId = await getProjectIdForWorkflow(workflow_id);
  if (projectId) {
    await broadcastStageEvent({
      action: "STAGES_REORDERED",
      project_id: projectId,
      workflow_id,
      stage_ids,
      origin: options?.origin ?? null,
    });
  }
}

export async function getStageById(id: string): Promise<Stage | null> {
  const result = await query<Stage>(
    `
    SELECT id, name, position, workflow_id
    FROM stages
    WHERE id = $1
    `,
    [id]
  );

  if (result.rowCount === 0) return null;
  return { ...result.rows[0], tasks: [] };
}
