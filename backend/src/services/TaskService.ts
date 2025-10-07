import { query } from "../db/index.js";
import type { Task, User } from "../../../shared/types.js";
import * as TagService from "./TagService.js";
import * as StageService from "./StageService.js";
import { publishTaskBoardEvent, type TaskBoardEvent, type TaskBoardEventAction } from "../events/taskBoardPubSub.js";

const TASK_BASE_SELECT = `
  SELECT
    t.id,
    t.stage_id,
    t.title,
    t.description,
    to_char(t.due_date, 'YYYY-MM-DD') AS due_date,
    t.priority,
    w.project_id,
    t.position
  FROM tasks t
  JOIN stages s ON s.id = t.stage_id
  JOIN workflows w ON w.id = s.workflow_id
  JOIN projects p ON p.id = w.project_id
`;

function normalizeDate(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function mapTaskRow(row: Task & { project_id: string; position: number }): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    due_date: row.due_date,
    priority: row.priority as Task["priority"],
    stage_id: row.stage_id,
    project_id: row.project_id,
    position: row.position,
  };
}

async function ensureTaskHydrated(task: Task): Promise<Task> {
  const needsTags = !Array.isArray(task.tags);
  const needsAssignees = !Array.isArray(task.assignees);
  const needsStage = !(task as unknown as { stage?: Task["stage"] }).stage;

  if (!needsTags && !needsAssignees && !needsStage) {
    return task;
  }

  const [tags, assignees, stage] = await Promise.all([
    needsTags ? TagService.getTagsForTask(task.id) : Promise.resolve(task.tags ?? []),
    needsAssignees ? getTaskMembers(task.id) : Promise.resolve(task.assignees ?? []),
    needsStage ? StageService.getStageById(task.stage_id) : Promise.resolve((task as unknown as { stage?: Task["stage"] }).stage ?? null),
  ]);

  return {
    ...task,
    tags: (tags ?? []) as Task["tags"],
    assignees: (assignees ?? []) as Task["assignees"],
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
  const stage = task.stage ?? (await StageService.getStageById(task.stage_id));
  await broadcastTaskEvent({
    action,
    project_id: task.project_id,
    workflow_id: stage?.workflow_id ?? null,
    stage_id: task.stage_id,
    task_id: task.id,
    origin: origin ?? null,
    ...extra,
  });
}

export async function getTasks(
  filter: { stage_id?: string; workflow_id?: string; project_id?: string },
  user_id: string | null
): Promise<Task[]> {
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (filter.stage_id) {
    params.push(filter.stage_id);
    conditions.push(`t.stage_id = $${params.length}`);
  }

  if (filter.workflow_id) {
    params.push(filter.workflow_id);
    conditions.push(`s.workflow_id = $${params.length}`);
  }

  if (filter.project_id) {
    params.push(filter.project_id);
    conditions.push(`w.project_id = $${params.length}`);
  }

  if (user_id) {
    params.push(user_id);
    conditions.push(`(
      p.is_public = true OR EXISTS (
        SELECT 1 FROM user_projects up
        WHERE up.project_id = p.id AND up.user_id = $${params.length}
      )
    )`);
  } else {
    conditions.push(`p.is_public = true`);
  }

  let sql = TASK_BASE_SELECT;
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(" AND ")}`;
  }
  sql += ` ORDER BY s.position ASC, t.position ASC, t.created_at ASC`;

  const result = await query<Task & { project_id: string; position: number }>(sql, params);
  return result.rows.map(mapTaskRow);
}

export async function getAllVisibleTasks(user_id: string | null): Promise<Task[]> {
  return await getTasks({}, user_id);
}

export async function getTaskById(id: string): Promise<Task | null> {
  const result = await query<Task & { project_id: string; position: number }>(
    `${TASK_BASE_SELECT} WHERE t.id = $1`,
    [id]
  );

  if (result.rowCount === 0) return null;
  return mapTaskRow(result.rows[0]);
}

export async function createTask({
  stage_id,
  title,
  description,
  due_date,
  priority,
}: {
  stage_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority?: string | null;
}, options?: { origin?: string | null }): Promise<Task> {
  const result = await query<{ id: string }>(
    `
    WITH next_position AS (
      SELECT COALESCE(MAX(position) + 1, 0) AS pos
      FROM tasks
      WHERE stage_id = $1
    )
    INSERT INTO tasks (stage_id, title, description, due_date, priority, position)
    VALUES (
      $1,
      $2,
      $3,
      COALESCE($4::DATE, NULL),
      $5,
      (SELECT pos FROM next_position)
    )
    RETURNING id
    `,
    [stage_id, title, description ?? null, normalizeDate(due_date), priority ?? null]
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
    stage_id,
    position,
  }: {
    title?: string;
    description?: string;
    due_date?: string | null;
    priority?: string | null;
    stage_id?: string;
    position?: number;
  },
  options?: { origin?: string | null }
): Promise<Task> {
  const beforeUpdate = await getTaskById(id);

  const result = await query<{ id: string }>(
    `
    UPDATE tasks
    SET title = COALESCE($2, title),
        description = COALESCE($3, description),
        due_date = COALESCE($4::DATE, due_date),
        priority = COALESCE($5, priority),
        stage_id = COALESCE($6, stage_id),
        position = COALESCE($7, position),
        updated_at = now()
    WHERE id = $1
    RETURNING id
    `,
    [
      id,
      title ?? null,
      description ?? null,
      normalizeDate(due_date),
      priority ?? null,
      stage_id ?? null,
      position ?? null,
    ]
  );

  if (result.rowCount === 0) throw new Error("Task not found");

  const task = await getTaskById(result.rows[0].id);
  if (!task) throw new Error("Task not found after update");
  const hydrated = await ensureTaskHydrated(task);
  await emitTaskUpdateEvent(hydrated, "TASK_UPDATED", options?.origin ?? null, {
    previous_stage_id:
      beforeUpdate && beforeUpdate.stage_id !== hydrated.stage_id
        ? beforeUpdate.stage_id
        : null,
  });
  return hydrated;
}

export async function moveTask(
  task_id: string,
  to_stage_id: string,
  options?: { origin?: string | null }
): Promise<Task> {
  const beforeMove = await getTaskById(task_id);

  const result = await query<{ id: string }>(
    `
    WITH next_position AS (
      SELECT COALESCE(MAX(position) + 1, 0) AS pos
      FROM tasks
      WHERE stage_id = $2
    )
    UPDATE tasks
    SET stage_id = $2,
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
  await emitTaskUpdateEvent(hydrated, "TASK_MOVED", options?.origin ?? null, {
    previous_stage_id: beforeMove?.stage_id ?? null,
  });
  return hydrated;
}

export async function deleteTask(id: string, options?: { origin?: string | null }): Promise<boolean> {
  const task = await getTaskById(id);
  const result = await query(
    `DELETE FROM tasks WHERE id = $1`,
    [id]
  );
  const deleted = (result.rowCount ?? 0) > 0;
  if (deleted && task) {
    const stage = task.stage ?? (task.stage_id ? await StageService.getStageById(task.stage_id) : null);
    await broadcastTaskEvent({
      action: "TASK_DELETED",
      project_id: task.project_id,
      workflow_id: stage?.workflow_id ?? null,
      stage_id: task.stage_id,
      task_id: task.id,
      origin: options?.origin ?? null,
    });
  }
  return deleted;
}

export async function updateTaskPriority(
  id: string,
  priority: string,
  options?: { origin?: string | null }
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
  options?: { origin?: string | null }
): Promise<void> {
  if (task_ids.length > 0) {
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
  }

  const projectId = await getProjectIdForStage(stage_id);
  if (projectId) {
    const stage = await StageService.getStageById(stage_id);
    await broadcastTaskEvent({
      action: "TASKS_REORDERED",
      project_id: projectId,
      workflow_id: stage?.workflow_id ?? null,
      stage_id,
      task_ids,
      origin: options?.origin ?? null,
    });
  }
}

export async function getProjectIdForStage(stage_id: string): Promise<string | null> {
  const result = await query<{ project_id: string }>(
    `
    SELECT w.project_id
    FROM stages s
    JOIN workflows w ON w.id = s.workflow_id
    WHERE s.id = $1
    `,
    [stage_id]
  );

  return result.rows[0]?.project_id ?? null;
}

export async function getTaskMembers(task_id: string): Promise<User[]> {
  const result = await query<User>(
    `
    SELECT u.id, u.first_name, u.last_name, u.username, u.avatar_color, u.created_at, u.updated_at
    FROM task_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE tm.task_id = $1
    ORDER BY u.first_name ASC, u.last_name ASC
    `,
    [task_id]
  );

  return result.rows;
}

export async function setTaskMembers(
  task_id: string,
  member_ids: string[],
  options?: { origin?: string | null }
): Promise<void> {
  await query("DELETE FROM task_members WHERE task_id = $1", [task_id]);

  if (member_ids.length > 0) {
    await query(
      `
      INSERT INTO task_members (task_id, user_id)
      SELECT $1, unnest($2::uuid[])
      ON CONFLICT DO NOTHING
      `,
      [task_id, member_ids]
    );
  }

  const task = await getTaskById(task_id);
  if (task) {
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
