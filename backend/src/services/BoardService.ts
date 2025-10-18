import { query } from "../db/index.js";
import type { Board, BoardWorkflowType } from "../../../shared/types.js";
import { BOARD_WORKFLOW_TYPES, DEFAULT_BOARD_WORKFLOW_TYPE } from "../../../shared/types.js";

function buildProjectAccessClause(user_id: string | null, paramIndex: number) {
  if (user_id) {
    return {
      clause: `(
        p.is_public = true OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = w.team_id
            AND tm.user_id = $${paramIndex}
            AND tm.status = 'active'
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

type BoardRow = {
  id: string;
  name: string;
  project_id: string;
  team_id: string;
  workflow_type: BoardWorkflowType | null;
};

function mapBoardRow(row: BoardRow): Board {
  return {
    id: row.id,
    name: row.name,
    project_id: row.project_id,
    team_id: row.team_id,
    workflow_type: (row.workflow_type ?? DEFAULT_BOARD_WORKFLOW_TYPE) as BoardWorkflowType,
    stages: [],
  };
}

export async function getBoardsByProject(
  project_id: string,
  user_id: string | null
): Promise<Board[]> {
  const params: unknown[] = [project_id];
  const { clause, params: accessParams } = buildProjectAccessClause(user_id, params.length + 1);
  params.push(...accessParams);

  const result = await query<BoardRow>(
    `
    SELECT w.id, w.name, w.project_id, w.team_id, w.workflow_type
    FROM workflows w
    JOIN projects p ON p.id = w.project_id
    WHERE w.project_id = $1
      AND ${clause}
    ORDER BY w.created_at ASC
    `,
    params
  );

  return result.rows.map(mapBoardRow);
}

export async function getBoardById(
  id: string,
  user_id: string | null
): Promise<Board | null> {
  const params: unknown[] = [id];
  const { clause, params: accessParams } = buildProjectAccessClause(user_id, params.length + 1);
  params.push(...accessParams);

  const result = await query<BoardRow>(
    `
    SELECT w.id, w.name, w.project_id, w.team_id, w.workflow_type
    FROM workflows w
    JOIN projects p ON p.id = w.project_id
    WHERE w.id = $1
      AND ${clause}
    `,
    params
  );

  if (result.rowCount === 0) return null;
  return mapBoardRow(result.rows[0]);
}

function validateWorkflowType(
  workflow_type: BoardWorkflowType | null | undefined
): BoardWorkflowType | null {
  if (workflow_type === null || workflow_type === undefined) {
    return null;
  }
  if (!BOARD_WORKFLOW_TYPES.includes(workflow_type)) {
    throw new Error("Invalid board workflow type.");
  }
  return workflow_type;
}

async function ensureBoardAccess(
  id: string,
  user_id: string | null
): Promise<{ project_id: string; team_id: string }> {
  const params: unknown[] = [id];
  const { clause, params: accessParams } = buildProjectAccessClause(user_id, params.length + 1);
  params.push(...accessParams);

  const result = await query<{ project_id: string; team_id: string }>(
    `
    SELECT w.project_id, w.team_id
    FROM workflows w
    JOIN projects p ON p.id = w.project_id
    WHERE w.id = $1
      AND ${clause}
    `,
    params
  );

  const context = result.rows[0];
  if (!context) {
    throw new Error("Board not found or not accessible");
  }
  return context;
}

export async function updateBoard(
  id: string,
  {
    name,
    workflow_type,
  }: {
    name?: string | null;
    workflow_type?: BoardWorkflowType | null;
  },
  user_id: string | null
): Promise<Board> {
  if (!user_id) {
    throw new Error("Not authenticated");
  }

  const context = await ensureBoardAccess(id, user_id);
  const sanitizedName = typeof name === "string" ? name.trim() : null;
  const nextWorkflowType = workflow_type ?? null;
  const validatedWorkflowType = validateWorkflowType(nextWorkflowType);

  const result = await query<BoardRow>(
    `
    UPDATE workflows
    SET
      name = COALESCE($2, name),
      workflow_type = COALESCE($3, workflow_type),
      updated_at = now()
    WHERE id = $1
    RETURNING id, name, project_id, $4::text AS team_id, workflow_type
    `,
    [
      id,
      sanitizedName ? (sanitizedName.length > 0 ? sanitizedName : null) : null,
      validatedWorkflowType ?? null,
      context.team_id,
    ]
  );

  if (result.rowCount === 0) {
    throw new Error("Board not found or not accessible");
  }

  return mapBoardRow({
    ...result.rows[0],
    project_id: context.project_id,
    team_id: context.team_id,
  });
}

export function listBoardWorkflowTypes(): BoardWorkflowType[] {
  return [...BOARD_WORKFLOW_TYPES];
}
