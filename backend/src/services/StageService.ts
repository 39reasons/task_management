import { query } from "../db/index.js";
import type { Stage } from "@shared/types";

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

export async function addStage(
  workflow_id: string,
  name: string,
  position?: number | null
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

  return { ...result.rows[0], tasks: [] };
}

export async function updateStage(
  id: string,
  name?: string,
  position?: number
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

  return { ...result.rows[0], tasks: [] };
}

export async function deleteStage(id: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM stages WHERE id = $1`,
    [id]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function reorderStages(
  workflow_id: string,
  stage_ids: string[]
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
