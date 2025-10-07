import { query } from "../db/index.js";
import type { Workflow } from "../../../shared/types.js";

function buildProjectAccessClause(user_id: string | null, paramIndex: number) {
  if (user_id) {
    return {
      clause: `(
        p.is_public = true OR EXISTS (
          SELECT 1 FROM user_projects up
          WHERE up.project_id = p.id AND up.user_id = $${paramIndex}
        )
      )`,
      params: [user_id],
    };
  }

  return {
    clause: `p.is_public = true`,
    params: [],
  };
}

export async function getWorkflowsByProject(
  project_id: string,
  user_id: string | null
): Promise<Workflow[]> {
  const params: unknown[] = [project_id];
  const { clause, params: accessParams } = buildProjectAccessClause(user_id, params.length + 1);
  params.push(...accessParams);

  const result = await query<{ id: string; name: string; project_id: string }>(
    `
    SELECT w.id, w.name, w.project_id
    FROM workflows w
    JOIN projects p ON p.id = w.project_id
    WHERE w.project_id = $1
      AND ${clause}
    ORDER BY w.created_at ASC
    `,
    params
  );

  return result.rows.map((row) => ({ ...row, stages: [] }));
}

export async function getWorkflowById(
  id: string,
  user_id: string | null
): Promise<Workflow | null> {
  const params: unknown[] = [id];
  const { clause, params: accessParams } = buildProjectAccessClause(user_id, params.length + 1);
  params.push(...accessParams);

  const result = await query<{ id: string; name: string; project_id: string }>(
    `
    SELECT w.id, w.name, w.project_id
    FROM workflows w
    JOIN projects p ON p.id = w.project_id
    WHERE w.id = $1
      AND ${clause}
    `,
    params
  );

  if (result.rowCount === 0) return null;
  const workflow = result.rows[0];
  return { ...workflow, stages: [] };
}
