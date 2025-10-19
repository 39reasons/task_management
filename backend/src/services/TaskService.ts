import { query } from "../db/index.js";
import type { Task, User, TaskHistoryEvent } from "../../../shared/types.js";
import * as TagService from "./TagService.js";
import * as StageService from "./StageService.js";
import * as UserService from "./UserService.js";
import { publishTaskBoardEvent, type TaskBoardEvent, type TaskBoardEventAction } from "../events/taskBoardPubSub.js";

type TaskMutationOptions = {
  origin?: string | null;
  actorId?: string | null;
};

type TaskRow = {
  id: string;
  project_id: string;
  team_id: string;
  stage_id: string | null;
  backlog_id: string | null;
  sprint_id: string | null;
  assignee_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string | null;
  estimate: number | null;
  status: string;
  position: number;
  board_id: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
};

const TASK_BASE_SELECT = `
  SELECT
    t.id,
    t.project_id,
    t.team_id,
    t.stage_id,
    t.backlog_id,
    t.sprint_id,
    t.assignee_id,
    t.title,
    t.description,
    to_char(t.due_date, 'YYYY-MM-DD') AS due_date,
    t.priority,
    t.estimate,
    t.status,
    t.position,
    s.workflow_id AS board_id,
    t.created_at,
    t.updated_at
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  LEFT JOIN stages s ON s.id = t.stage_id
`;

function normalizeDate(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeTimestamp(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

const VALID_TASK_STATUSES: ReadonlySet<Task["status"]> = new Set(["new", "active", "closed"]);

function sanitizeTaskStatus(input?: string | null): Task["status"] {
  const candidate = (input ?? "").trim().toLowerCase();
  if (!candidate) {
    return "new";
  }
  if (VALID_TASK_STATUSES.has(candidate as Task["status"])) {
    return candidate as Task["status"];
  }
  throw new Error("Invalid task status.");
}

type StageHistorySnapshot = { id: string; name?: string | null } | null;
type UserHistorySnapshot = {
  id: string;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
} | null;

function serializeHistoryPayload(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, (_key, value) => (value === undefined ? null : value));
}

async function getStageHistorySnapshot(stageId: string | null | undefined): Promise<StageHistorySnapshot> {
  if (!stageId) {
    return null;
  }
  const stage = await StageService.getStageById(stageId);
  if (!stage) {
    return { id: stageId };
  }
  return { id: stage.id, name: stage.name };
}

async function getUserHistorySnapshot(userId: string | null | undefined): Promise<UserHistorySnapshot> {
  if (!userId) {
    return null;
  }
  const user = await UserService.getUserById(userId);
  if (!user) {
    return { id: userId };
  }
  return {
    id: user.id,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
  };
}

async function insertTaskHistoryEvent(params: {
  task_id: string;
  project_id: string;
  team_id: string;
  actor_id?: string | null;
  event_type: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const { task_id, project_id, team_id, actor_id, event_type, payload } = params;
  await query(
    `
      INSERT INTO task_history_events (task_id, project_id, team_id, actor_id, event_type, payload)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [task_id, project_id, team_id, actor_id ?? null, event_type, serializeHistoryPayload(payload)]
  );
}

async function recordTaskStatusChange(existing: Task, updated: Task, actorId?: string | null): Promise<void> {
  if (existing.status === updated.status) {
    return;
  }

  await insertTaskHistoryEvent({
    task_id: updated.id,
    project_id: updated.project_id,
    team_id: updated.team_id,
    actor_id: actorId ?? null,
    event_type: "STATUS_CHANGED",
    payload: {
      from: existing.status,
      to: updated.status,
    },
  });
}

async function recordTaskStageChange(previous: Task, next: Task, actorId?: string | null): Promise<void> {
  const previousStageId = previous.stage_id ?? null;
  const nextStageId = next.stage_id ?? null;

  if (previousStageId === nextStageId) {
    return;
  }

  const [fromStage, toStage] = await Promise.all([
    getStageHistorySnapshot(previousStageId),
    getStageHistorySnapshot(nextStageId),
  ]);

  await insertTaskHistoryEvent({
    task_id: next.id,
    project_id: next.project_id,
    team_id: next.team_id,
    actor_id: actorId ?? null,
    event_type: "STAGE_CHANGED",
    payload: {
      from: fromStage,
      to: toStage,
    },
  });
}

async function recordTaskAssigneeChange(previous: Task, next: Task, actorId?: string | null): Promise<void> {
  const previousAssigneeId = previous.assignee_id ?? null;
  const nextAssigneeId = next.assignee_id ?? null;

  if (previousAssigneeId === nextAssigneeId) {
    return;
  }

  const [fromAssignee, toAssignee] = await Promise.all([
    getUserHistorySnapshot(previousAssigneeId),
    getUserHistorySnapshot(nextAssigneeId),
  ]);

  await insertTaskHistoryEvent({
    task_id: next.id,
    project_id: next.project_id,
    team_id: next.team_id,
    actor_id: actorId ?? null,
    event_type: "ASSIGNEE_CHANGED",
    payload: {
      from: fromAssignee,
      to: toAssignee,
    },
  });
}

type TaskHistoryEventRow = {
  id: string;
  task_id: string;
  project_id: string;
  team_id: string;
  actor_id: string | null;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: Date | string | null;
};

function mapTaskHistoryEventRow(row: TaskHistoryEventRow): TaskHistoryEvent {
  const payloadValue = row.payload;
  const normalizedPayload =
    payloadValue && typeof payloadValue === "object" && !Array.isArray(payloadValue)
      ? payloadValue
      : payloadValue ?? null;

  return {
    id: row.id,
    event_type: row.event_type as TaskHistoryEvent["event_type"],
    payload: normalizedPayload,
    created_at: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
    task_id: row.task_id,
    project_id: row.project_id,
    team_id: row.team_id,
    actor_id: row.actor_id ?? null,
    actor: null,
  };
}

function mapTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    due_date: row.due_date,
    priority: (row.priority as Task["priority"]) ?? null,
    estimate: row.estimate ?? null,
    status: sanitizeTaskStatus(row.status),
    stage_id: row.stage_id ?? null,
    backlog_id: row.backlog_id ?? null,
    sprint_id: row.sprint_id ?? null,
    project_id: row.project_id,
    team_id: row.team_id,
    position: row.position,
    assignee_id: row.assignee_id ?? null,
    assignee: null,
    sprint: null,
    stage: null,
    tags: [],
    created_at: normalizeTimestamp(row.created_at),
    updated_at: normalizeTimestamp(row.updated_at),
  };
}

async function ensureTaskHydrated(task: Task): Promise<Task> {
  const needsTags = !Array.isArray(task.tags);
  const needsStage = task.stage_id ? !(task as unknown as { stage?: Task["stage"] }).stage : false;
  const needsAssignee = task.assignee_id
    ? !(task as unknown as { assignee?: Task["assignee"] }).assignee
    : false;

  const [tags, assignee, stage] = await Promise.all([
    needsTags ? TagService.getTagsForTask(task.id) : Promise.resolve(task.tags ?? []),
    needsAssignee && task.assignee_id ? UserService.getUserById(task.assignee_id) : Promise.resolve(task.assignee ?? null),
    needsStage && task.stage_id ? StageService.getStageById(task.stage_id) : Promise.resolve(null),
  ]);

  return {
    ...task,
    tags: (tags ?? []) as Task["tags"],
    assignee: task.assignee_id ? (assignee ?? task.assignee ?? null) : null,
    ...(stage
      ? {
          stage: {
            ...stage,
            tasks: [],
          },
        }
      : {}),
  };
}

async function broadcastTaskEvent(event: Omit<TaskBoardEvent, "timestamp">): Promise<void> {
  await publishTaskBoardEvent({
    ...event,
    timestamp: new Date().toISOString(),
  });
}

async function emitTaskUpdateEvent(
  task: Task,
  action: TaskBoardEventAction,
  origin?: string | null,
  extra?: Partial<TaskBoardEvent>
): Promise<void> {
  const stage = task.stage_id ? task.stage ?? (await StageService.getStageById(task.stage_id)) : null;
  await broadcastTaskEvent({
    action,
    project_id: task.project_id,
    team_id: task.team_id ?? null,
    board_id: stage?.board_id ?? null,
    stage_id: task.stage_id ?? null,
    task_id: task.id,
    origin: origin ?? null,
    ...extra,
  });
}

type TaskFilter = {
  team_id?: string;
  project_id?: string;
  stage_id?: string;
  backlog_id?: string | null;
  board_id?: string;
  sprint_id?: string;
};

export async function getTasks(filter: TaskFilter, user_id: string | null): Promise<Task[]> {
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (filter.team_id) {
    params.push(filter.team_id);
    conditions.push(`t.team_id = $${params.length}`);
  }

  if (filter.project_id) {
    params.push(filter.project_id);
    conditions.push(`t.project_id = $${params.length}`);
  }

  if (filter.stage_id !== undefined) {
    if (filter.stage_id === null) {
      conditions.push(`t.stage_id IS NULL`);
    } else {
      params.push(filter.stage_id);
      conditions.push(`t.stage_id = $${params.length}`);
    }
  }

  if (filter.backlog_id !== undefined) {
    if (filter.backlog_id === null) {
      conditions.push(`t.backlog_id IS NULL`);
    } else {
      params.push(filter.backlog_id);
      conditions.push(`t.backlog_id = $${params.length}`);
    }
  }

  if (filter.board_id) {
    params.push(filter.board_id);
    conditions.push(`s.workflow_id = $${params.length}`);
  }

  if (filter.sprint_id !== undefined) {
    if (filter.sprint_id === null) {
      conditions.push(`t.sprint_id IS NULL`);
    } else {
      params.push(filter.sprint_id);
      conditions.push(`t.sprint_id = $${params.length}`);
    }
  }

  if (user_id) {
    params.push(user_id);
    const idx = params.length;
    conditions.push(`(
      p.is_public = true
      OR EXISTS (
        SELECT 1 FROM user_projects up
        WHERE up.project_id = t.project_id
          AND up.user_id = $${idx}
      )
      OR EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = t.team_id
          AND tm.user_id = $${idx}
          AND tm.status = 'active'
      )
    )`);
  } else {
    conditions.push(`p.is_public = true`);
  }

  let sql = TASK_BASE_SELECT;
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(" AND ")}`;
  }
  sql += ` ORDER BY COALESCE(s.position, 0) ASC, t.position ASC, t.created_at ASC`;

  const result = await query<TaskRow>(sql, params);
  return result.rows.map(mapTaskRow);
}

export async function getAllVisibleTasks(user_id: string | null): Promise<Task[]> {
  return await getTasks({}, user_id);
}

export async function getTaskById(id: string): Promise<Task | null> {
  const result = await query<TaskRow>(`${TASK_BASE_SELECT} WHERE t.id = $1`, [id]);
  if (result.rowCount === 0) return null;
  return mapTaskRow(result.rows[0]);
}

async function getProjectTeamForStage(stage_id: string): Promise<{ project_id: string; team_id: string } | null> {
  return await getProjectIdForStage(stage_id);
}

async function assertStageMatchesContext(
  stage_id: string,
  project_id: string,
  team_id?: string | null
): Promise<void> {
  const context = await getProjectTeamForStage(stage_id);
  if (!context) {
    throw new Error("Stage not found");
  }
  if (context.project_id !== project_id) {
    throw new Error("Stage does not belong to the specified project");
  }
  if (team_id && context.team_id !== team_id) {
    throw new Error("Stage does not belong to the specified team");
  }
}

async function assertBacklogMatchesContext(
  backlog_id: string,
  project_id: string,
  team_id?: string | null
): Promise<void> {
  const result = await query<{ team_id: string }>(
    `
      SELECT b.team_id
      FROM backlogs b
      JOIN teams t ON t.id = b.team_id
      WHERE b.id = $1 AND t.project_id = $2
    `,
    [backlog_id, project_id]
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("Backlog does not belong to the specified project");
  }
  if (team_id && row.team_id !== team_id) {
    throw new Error("Backlog does not belong to the specified team");
  }
}

async function assertSprintMatchesContext(
  sprint_id: string,
  project_id: string,
  team_id?: string | null
): Promise<void> {
  const result = await query<{ team_id: string }>(
    `SELECT team_id FROM sprints WHERE id = $1 AND project_id = $2`,
    [sprint_id, project_id]
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("Sprint does not belong to the specified project");
  }
  if (team_id && row.team_id !== team_id) {
    throw new Error("Sprint does not belong to the specified team");
  }
}

async function assertTeamBelongsToProject(team_id: string, project_id: string): Promise<void> {
  const result = await query<{ id: string }>(
    `SELECT id FROM teams WHERE id = $1 AND project_id = $2`,
    [team_id, project_id]
  );
  if (result.rowCount === 0) {
    throw new Error("Team does not belong to the specified project");
  }
}

function buildPositionQuery(
  stage_id?: string | null,
  backlog_id?: string | null,
  team_id?: string | null,
  project_id?: string | null
) {
  if (stage_id) {
    return {
      sql: `
        SELECT COALESCE(MAX(position) + 1, 0) AS pos
        FROM tasks
        WHERE stage_id = $1
      `,
      params: [stage_id],
    };
  }

  if (backlog_id) {
    return {
      sql: `
        SELECT COALESCE(MAX(position) + 1, 0) AS pos
        FROM tasks
        WHERE backlog_id = $1
          AND stage_id IS NULL
      `,
      params: [backlog_id],
    };
  }

  const params: unknown[] = [];
  let whereClause = `
      stage_id IS NULL
      AND backlog_id IS NULL
  `;

  if (project_id) {
    params.push(project_id);
    whereClause += ` AND project_id = $${params.length}`;
  }

  if (team_id) {
    params.push(team_id);
    whereClause += ` AND team_id = $${params.length}`;
  }

  return {
    sql: `
      SELECT COALESCE(MAX(position) + 1, 0) AS pos
      FROM tasks
      WHERE ${whereClause}
    `,
    params,
  };
}

export async function createTask(
  {
    project_id,
    team_id,
    stage_id,
    backlog_id,
    sprint_id,
    title,
    description,
    due_date,
    priority,
    estimate,
    status,
  }: {
    project_id: string;
    stage_id?: string | null;
    backlog_id?: string | null;
    sprint_id?: string | null;
    title: string;
    description?: string | null;
    due_date?: string | null;
    priority?: string | null;
    estimate?: number | null;
    status?: string | null;
    team_id: string;
  },
  options?: TaskMutationOptions
): Promise<Task> {
  if (!project_id) {
    throw new Error("Project is required to create a task");
  }

  if (!team_id) {
    throw new Error("Team is required to create a task");
  }

  await assertTeamBelongsToProject(team_id, project_id);

  if (stage_id) {
    await assertStageMatchesContext(stage_id, project_id, team_id);
  }

  if (backlog_id) {
    await assertBacklogMatchesContext(backlog_id, project_id, team_id);
  }

  if (sprint_id) {
    await assertSprintMatchesContext(sprint_id, project_id, team_id);
  }

  const sanitizedStatus = sanitizeTaskStatus(status ?? undefined);
  const normalizedStageId = stage_id ?? null;
  const normalizedBacklogId = normalizedStageId ? null : backlog_id ?? null;
  const normalizedSprintId = sprint_id ?? null;

  const positionQuery = buildPositionQuery(normalizedStageId, normalizedBacklogId, team_id, project_id);
  const positionParams =
    positionQuery.params.length > 0 ? positionQuery.params : [project_id, team_id].filter(Boolean);

  const positionResult = await query<{ pos: number }>(positionQuery.sql, positionParams);
  const nextPosition = positionResult.rows[0]?.pos ?? 0;

  const result = await query<{ id: string }>(
    `
      INSERT INTO tasks (
        project_id,
        team_id,
        stage_id,
        backlog_id,
        sprint_id,
        position,
        title,
        description,
        due_date,
        priority,
        estimate,
        status
      )
      VALUES (
        $1,
        $2,
        $3::uuid,
        $4::uuid,
        $5::uuid,
        $6,
        $7,
        $8,
        COALESCE($9::DATE, NULL),
        $10,
        $11,
        $12
      )
      RETURNING id
    `,
    [
      project_id,
      team_id,
      normalizedStageId,
      normalizedBacklogId,
      normalizedSprintId,
      nextPosition,
      title.trim(),
      description ?? null,
      normalizeDate(due_date),
      priority ?? null,
      estimate ?? null,
      sanitizedStatus,
    ]
  );

  const task = await getTaskById(result.rows[0].id);
  if (!task) throw new Error("Failed to create task");
  const hydrated = await ensureTaskHydrated(task);
  await emitTaskUpdateEvent(hydrated, "TASK_CREATED", options?.origin ?? null);
  return hydrated;
}

export async function updateTask(
  id: string,
  {
    title,
    description,
    due_date,
    priority,
    estimate,
    status,
    stage_id,
    backlog_id,
    sprint_id,
    position,
  }: {
    title?: string;
    description?: string | null;
    due_date?: string | null;
    priority?: string | null;
    estimate?: number | null;
    status?: string | null;
    stage_id?: string | null;
    backlog_id?: string | null;
    sprint_id?: string | null;
    position?: number;
  },
  options?: TaskMutationOptions
): Promise<Task> {
  const existing = await getTaskById(id);
  if (!existing) {
    throw new Error("Task not found");
  }

  const targetProjectId = existing.project_id;
  const targetTeamId = existing.team_id;

  let normalizedStageId = stage_id === undefined ? existing.stage_id ?? null : stage_id;
  let normalizedBacklogId =
    backlog_id === undefined
      ? existing.backlog_id ?? null
      : backlog_id;

  if (normalizedStageId) {
    await assertStageMatchesContext(normalizedStageId, targetProjectId, targetTeamId);
    normalizedBacklogId = null;
  } else if (normalizedBacklogId) {
    await assertBacklogMatchesContext(normalizedBacklogId, targetProjectId, targetTeamId);
  }

  let normalizedSprintId =
    sprint_id === undefined ? existing.sprint_id ?? null : sprint_id;

  if (normalizedSprintId) {
    await assertSprintMatchesContext(normalizedSprintId, targetProjectId, targetTeamId);
  }

  const sanitizedStatus = status === undefined ? null : sanitizeTaskStatus(status);

  const normalizedDescription = (() => {
    if (description === undefined) return existing.description ?? null;
    if (description === null) return null;
    const trimmed = description.trim();
    return trimmed.length > 0 ? trimmed : null;
  })();

  const result = await query<{ id: string }>(
    `
      UPDATE tasks
      SET
        title = COALESCE($2, title),
        description = $3,
        due_date = COALESCE($4::DATE, due_date),
        priority = COALESCE($5, priority),
        estimate = COALESCE($6, estimate),
        status = COALESCE($7, status),
        stage_id = $8::uuid,
        backlog_id = $9::uuid,
        sprint_id = $10::uuid,
        position = COALESCE($11, position),
        updated_at = now()
      WHERE id = $1
      RETURNING id
    `,
    [
      id,
      title ?? null,
      normalizedDescription,
      normalizeDate(due_date),
      priority ?? null,
      estimate ?? null,
      sanitizedStatus,
      normalizedStageId,
      normalizedBacklogId,
      normalizedSprintId,
      position ?? null,
    ]
  );

  if (result.rowCount === 0) {
    throw new Error("Task not found");
  }

  const task = await getTaskById(result.rows[0].id);
  if (!task) throw new Error("Task not found after update");
  const hydrated = await ensureTaskHydrated(task);
  await recordTaskStatusChange(existing, hydrated, options?.actorId ?? null);
  await emitTaskUpdateEvent(hydrated, "TASK_UPDATED", options?.origin ?? null, {
    previous_stage_id:
      existing.stage_id && existing.stage_id !== hydrated.stage_id ? existing.stage_id : null,
  });
  return hydrated;
}

export async function moveTask(
  task_id: string,
  to_stage_id: string,
  options?: TaskMutationOptions
): Promise<Task> {
  const beforeMove = await getTaskById(task_id);

  if (!beforeMove) {
    throw new Error("Task not found");
  }

  await assertStageMatchesContext(to_stage_id, beforeMove.project_id, beforeMove.team_id);

  const result = await query<{ id: string }>(
    `
      WITH next_position AS (
        SELECT COALESCE(MAX(position) + 1, 0) AS pos
        FROM tasks
        WHERE stage_id = $2
      )
      UPDATE tasks
      SET stage_id = $2,
          backlog_id = NULL,
          position = (SELECT pos FROM next_position),
          updated_at = now()
      WHERE id = $1
      RETURNING id
    `,
    [task_id, to_stage_id]
  );

  if (result.rowCount === 0) throw new Error("Task not found");
  const task = await getTaskById(result.rows[0].id);
  if (!task) throw new Error("Task not found after move");
  const hydrated = await ensureTaskHydrated(task);
  await recordTaskStageChange(beforeMove, hydrated, options?.actorId ?? null);
  await emitTaskUpdateEvent(hydrated, "TASK_MOVED", options?.origin ?? null, {
    previous_stage_id: beforeMove.stage_id ?? null,
  });
  return hydrated;
}

export async function deleteTask(id: string, options?: TaskMutationOptions): Promise<boolean> {
  const task = await getTaskById(id);
  const result = await query(`DELETE FROM tasks WHERE id = $1`, [id]);
  const deleted = (result.rowCount ?? 0) > 0;
  if (deleted && task) {
    const stage = task.stage_id ? task.stage ?? (await StageService.getStageById(task.stage_id)) : null;
    await broadcastTaskEvent({
      action: "TASK_DELETED",
      project_id: task.project_id,
      team_id: task.team_id ?? null,
      board_id: stage?.board_id ?? null,
      stage_id: task.stage_id ?? null,
      task_id: task.id,
      origin: options?.origin ?? null,
    });
  }
  return deleted;
}

export async function updateTaskPriority(
  id: string,
  priority: string,
  options?: TaskMutationOptions
): Promise<Task> {
  const result = await query<{ id: string }>(
    `
      UPDATE tasks
      SET priority = $2,
          updated_at = now()
      WHERE id = $1
      RETURNING id
    `,
    [id, priority]
  );

  if (result.rowCount === 0) throw new Error("Task not found");
  const task = await getTaskById(result.rows[0].id);
  if (!task) throw new Error("Task not found after update");
  const hydrated = await ensureTaskHydrated(task);
  await emitTaskUpdateEvent(hydrated, "TASK_UPDATED", options?.origin ?? null);
  return hydrated;
}

export async function reorderTasks(
  stage_id: string,
  task_ids: string[],
  options?: TaskMutationOptions
): Promise<void> {
  if (task_ids.length === 0) {
    return;
  }

  await query(
    `
      WITH ordered AS (
        SELECT
          value AS id,
          ordinality - 1 AS position
        FROM unnest($2::uuid[]) WITH ORDINALITY AS u(value, ordinality)
      )
      UPDATE tasks t
      SET position = ordered.position,
          updated_at = now()
      FROM ordered
      WHERE t.id = ordered.id AND t.stage_id = $1
    `,
    [stage_id, task_ids]
  );

  const projectId = await getProjectIdForStage(stage_id);
  if (projectId) {
    const stage = await StageService.getStageById(stage_id);
    await broadcastTaskEvent({
      action: "TASKS_REORDERED",
      project_id: projectId.project_id,
      team_id: projectId.team_id,
      board_id: stage?.board_id ?? null,
      stage_id,
      task_ids,
      origin: options?.origin ?? null,
    });
  }
}

export async function reorderBacklogTasks(
  project_id: string,
  team_id: string,
  backlog_id: string | null,
  task_ids: string[],
  options?: TaskMutationOptions
): Promise<void> {
  if (task_ids.length === 0) {
    return;
  }

  if (!team_id) {
    throw new Error("Team is required to reorder backlog tasks");
  }

  await assertTeamBelongsToProject(team_id, project_id);

  if (backlog_id) {
    await assertBacklogMatchesContext(backlog_id, project_id, team_id);
  } else {
    // Ensure the project exists before attempting to reorder unassigned tasks.
    const projectResult = await query<{ id: string }>(`SELECT id FROM projects WHERE id = $1`, [project_id]);
    if (projectResult.rowCount === 0) {
      throw new Error("Project not found");
    }
  }

  const params: unknown[] = [project_id, task_ids, team_id];
  let backlogCondition = "t.backlog_id IS NULL";

  if (backlog_id) {
    params.push(backlog_id);
    backlogCondition = "t.backlog_id = $4::uuid";
  }

  await query(
    `
      WITH ordered AS (
        SELECT
          value AS id,
          ordinality - 1 AS position
        FROM unnest($2::uuid[]) WITH ORDINALITY AS u(value, ordinality)
      )
      UPDATE tasks t
      SET position = ordered.position,
          updated_at = now()
      FROM ordered
      WHERE t.id = ordered.id
        AND t.stage_id IS NULL
        AND ${backlogCondition}
        AND t.project_id = $1
        AND t.team_id = $3
    `,
    params
  );

  await broadcastTaskEvent({
    action: "TASKS_REORDERED",
    project_id,
    team_id,
    board_id: null,
    stage_id: null,
    task_ids,
    origin: options?.origin ?? null,
  });
}

export async function getProjectIdForStage(stage_id: string): Promise<{ project_id: string; team_id: string } | null> {
  const result = await query<{ project_id: string; team_id: string }>(
    `
    SELECT w.project_id, w.team_id
    FROM stages s
    JOIN workflows w ON w.id = s.workflow_id
    WHERE s.id = $1
    `,
    [stage_id]
  );

  const row = result.rows[0];
  return row ? { project_id: row.project_id, team_id: row.team_id } : null;
}

export async function getTaskHistory(task_id: string, limit: number = 50): Promise<TaskHistoryEvent[]> {
  const normalizedLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 200) : 50;
  const result = await query<TaskHistoryEventRow>(
    `
      SELECT id, task_id, project_id, team_id, actor_id, event_type, payload, created_at
      FROM task_history_events
      WHERE task_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2
    `,
    [task_id, normalizedLimit]
  );

  const events = result.rows.map(mapTaskHistoryEventRow);
  const actorIds = Array.from(
    new Set(events.map((event) => event.actor_id).filter((value): value is string => Boolean(value)))
  );

  if (actorIds.length > 0) {
    const actors = await UserService.getUsersByIds(actorIds);
    const actorMap = new Map(actors.map((actor) => [actor.id, actor]));
    for (const event of events) {
      event.actor = event.actor_id ? actorMap.get(event.actor_id) ?? null : null;
    }
  } else {
    for (const event of events) {
      event.actor = null;
    }
  }

  return events;
}

export async function getTaskAssignee(taskOrId: Task | string): Promise<User | null> {
  const task = typeof taskOrId === "string" ? await getTaskById(taskOrId) : taskOrId;
  if (!task || !task.assignee_id) {
    return null;
  }
  if ((task as unknown as { assignee?: User | null }).assignee) {
    return (task as unknown as { assignee?: User | null }).assignee ?? null;
  }
  return await UserService.getUserById(task.assignee_id);
}

export async function setTaskAssignee(
  task_id: string,
  member_id: string | null,
  options?: TaskMutationOptions
): Promise<void> {
  const existing = await getTaskById(task_id);

  await query(
    `
    UPDATE tasks
    SET assignee_id = $2,
        updated_at = now()
    WHERE id = $1
    `,
    [task_id, member_id]
  );

  const task = await getTaskById(task_id);
  if (task) {
    if (existing) {
      await recordTaskAssigneeChange(existing, task, options?.actorId ?? null);
    }
    await notifyTaskUpdated(task, options?.origin ?? null);
  }
}

export async function notifyTaskUpdated(taskOrId: Task | string, origin?: string | null): Promise<Task | null> {
  const task = typeof taskOrId === "string" ? await getTaskById(taskOrId) : taskOrId;
  if (!task) return null;
  const hydrated = await ensureTaskHydrated(task);
  await emitTaskUpdateEvent(hydrated, "TASK_UPDATED", origin ?? null);
  return hydrated;
}
