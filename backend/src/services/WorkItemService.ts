import { query, withTransaction } from "../db/index.js";
import {
  type BugTaskDetails,
  type IssueTaskDetails,
  type Task,
  type TaskKind,
  type Tag,
  type User,
  type WorkItem,
  type WorkItemComment,
  type WorkItemType,
} from "../../../shared/types.js";
import {
  createTask,
  sanitizeTaskStatus,
  sanitizeTaskKind,
  normalizeDate,
  normalizeTimestamp,
  getTaskById,
} from "./TaskService.js";
import * as UserService from "./UserService.js";

type MutationOptions = {
  origin?: string | null;
  actorId?: string | null;
};

type Queryable = {
  query<T = unknown>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }>;
};

type WorkItemRow = {
  id: string;
  type: WorkItemType;
  task_kind: TaskKind | null;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  estimate: number | null;
  due_date: string | null;
  position: number | null;
  project_id: string;
  team_id: string;
  stage_id: string | null;
  backlog_id: string | null;
  sprint_id: string | null;
  assignee_id: string | null;
  assignee_first_name: string | null;
  assignee_last_name: string | null;
  assignee_username: string | null;
  assignee_avatar_color: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  parent_id: string | null;
};

export type CreateWorkItemInput = {
  type: WorkItemType;
  project_id: string;
  team_id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  estimate?: number | null;
  due_date?: string | null;
  stage_id?: string | null;
  backlog_id?: string | null;
  sprint_id?: string | null;
  assignee_id?: string | null;
  task_kind?: TaskKind | string | null;
  bug_details?: Partial<BugTaskDetails> | null;
  issue_details?: Partial<IssueTaskDetails> | null;
  parent_id?: string | null;
};

export type UpdateWorkItemInput = {
  title?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  estimate?: number | null;
  due_date?: string | null;
};

const WORK_ITEM_BASE_SELECT = `
  SELECT
    wi.id,
    wi.type,
    wi.task_kind,
    wi.title,
    wi.description,
    wi.status,
    wi.priority,
    wi.estimate,
    to_char(wi.due_date, 'YYYY-MM-DD') AS due_date,
    wi.position,
    wi.project_id,
    wi.team_id,
    wi.stage_id,
    wi.backlog_id,
    wi.sprint_id,
    wi.assignee_id,
    assignee.first_name AS assignee_first_name,
    assignee.last_name AS assignee_last_name,
    assignee.username AS assignee_username,
    assignee.avatar_color AS assignee_avatar_color,
    wi.created_at,
    wi.updated_at,
    parent_link.parent_id
  FROM work_items wi
  LEFT JOIN users assignee ON assignee.id = wi.assignee_id
  LEFT JOIN LATERAL (
    SELECT parent_id
    FROM work_item_links
    WHERE child_id = wi.id
    LIMIT 1
  ) AS parent_link ON TRUE
`;

const WORK_ITEM_TYPES: ReadonlySet<WorkItemType> = new Set(["EPIC", "FEATURE", "STORY", "TASK", "BUG"]);

function assertWorkItemType(type: string): WorkItemType {
  const candidate = type.toUpperCase() as WorkItemType;
  if (!WORK_ITEM_TYPES.has(candidate)) {
    throw new Error("Unsupported work item type.");
  }
  return candidate;
}

function getSubtypeTableName(type: WorkItemType): string {
  switch (type) {
    case "EPIC":
      return "epic_items";
    case "FEATURE":
      return "feature_items";
    case "STORY":
      return "story_items";
    case "TASK":
      return "task_items";
    case "BUG":
      return "bug_items";
    default:
      throw new Error("Unsupported work item subtype table.");
  }
}

function mapWorkItemRow(row: WorkItemRow): WorkItem {
  const assignee: User | null = row.assignee_id
    ? {
        id: row.assignee_id,
        first_name: row.assignee_first_name ?? "",
        last_name: row.assignee_last_name ?? "",
        username: row.assignee_username ?? "",
        avatar_color: row.assignee_avatar_color ?? null,
      }
    : null;

  return {
    id: row.id,
    type: row.type,
    task_kind: row.task_kind ?? null,
    title: row.title,
    description: row.description ?? null,
    status: sanitizeTaskStatus(row.status),
    priority: (row.priority as Task["priority"]) ?? null,
    estimate: row.estimate ?? null,
    due_date: row.due_date ?? null,
    position: row.position ?? null,
    project_id: row.project_id,
    team_id: row.team_id,
    stage_id: row.stage_id ?? null,
    backlog_id: row.backlog_id ?? null,
    sprint_id: row.sprint_id ?? null,
    assignee_id: row.assignee_id ?? null,
    assignee,
    created_at: normalizeTimestamp(row.created_at) ?? null,
    updated_at: normalizeTimestamp(row.updated_at) ?? null,
    parent_id: row.parent_id ?? null,
    children: [],
    tags: [],
    comments: [],
  };
}

function sanitizeWorkItemStatus(input?: string | null): string {
  return sanitizeTaskStatus(input ?? null);
}

async function getWorkItemRowById(id: string): Promise<WorkItemRow | null> {
  const result = await query<WorkItemRow>(`${WORK_ITEM_BASE_SELECT} WHERE wi.id = $1`, [id]);
  return result.rows[0] ?? null;
}

async function ensureChildHasAtMostOneParent(
  client: Queryable,
  childId: string,
  parentId?: string | null
): Promise<void> {
  const existing = await client.query<{ parent_id: string }>(
    `SELECT parent_id FROM work_item_links WHERE child_id = $1`,
    [childId]
  );
  if (existing.rowCount === 0 || !parentId) {
    return;
  }
  if (existing.rows.some((row) => row.parent_id !== parentId)) {
    throw new Error("Work item already has a parent.");
  }
}

type WorkItemCommentRow = {
  id: string;
  work_item_id: string;
  user_id: string;
  content: string;
  created_at: Date | string;
  updated_at: Date | string;
  user_first_name: string | null;
  user_last_name: string | null;
  user_username: string | null;
  user_avatar_color: string | null;
};

function mapWorkItemCommentRow(row: WorkItemCommentRow): WorkItemComment {
  return {
    id: row.id,
    work_item_id: row.work_item_id,
    user_id: row.user_id,
    content: row.content,
    created_at: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
    updated_at: normalizeTimestamp(row.updated_at) ?? new Date().toISOString(),
    user: {
      id: row.user_id,
      first_name: row.user_first_name ?? "",
      last_name: row.user_last_name ?? "",
      username: row.user_username ?? "",
      avatar_color: row.user_avatar_color ?? null,
    },
  };
}

export async function getWorkItemById(id: string): Promise<WorkItem | null> {
  const row = await getWorkItemRowById(id);
  if (!row) return null;
  const mapped = mapWorkItemRow(row);
  return await ensureWorkItemHydrated(mapped);
}

export async function listWorkItems(filters: {
  project_id?: string;
  team_id?: string;
  types?: WorkItemType[];
  parent_id?: string | null;
}): Promise<WorkItem[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let joinClause = "";

  if (filters.parent_id) {
    params.push(filters.parent_id);
    joinClause = `JOIN work_item_links fil ON fil.child_id = wi.id AND fil.parent_id = $${params.length}`;
  }

  if (filters.project_id) {
    params.push(filters.project_id);
    conditions.push(`wi.project_id = $${params.length}`);
  }

  if (filters.team_id) {
    params.push(filters.team_id);
    conditions.push(`wi.team_id = $${params.length}`);
  }

  if (filters.types && filters.types.length > 0) {
    params.push(filters.types);
    conditions.push(`wi.type = ANY($${params.length}::work_item_type[])`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    ${WORK_ITEM_BASE_SELECT}
    ${joinClause}
    ${whereClause}
    ORDER BY wi.created_at DESC
  `;

  const result = await query<WorkItemRow>(sql, params);
  return result.rows.map(mapWorkItemRow);
}

async function getWorkItemTags(workItemId: string): Promise<Tag[]> {
  const result = await query<{ id: string; name: string; color: string | null }>(
    `
      SELECT t.id, t.name, t.color
      FROM tags t
      JOIN work_item_tags wit ON wit.tag_id = t.id
      WHERE wit.work_item_id = $1
      ORDER BY t.name ASC
    `,
    [workItemId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color ?? null,
  }));
}

export async function fetchWorkItemTags(workItemId: string): Promise<Tag[]> {
  return await getWorkItemTags(workItemId);
}

async function getWorkItemComments(workItemId: string): Promise<WorkItemComment[]> {
  const result = await query<WorkItemCommentRow>(
    `
      SELECT
        c.id,
        c.work_item_id,
        c.user_id,
        c.content,
        c.created_at,
        c.updated_at,
        u.first_name AS user_first_name,
        u.last_name AS user_last_name,
        u.username AS user_username,
        u.avatar_color AS user_avatar_color
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.work_item_id = $1
      ORDER BY c.created_at ASC
    `,
    [workItemId]
  );

  return result.rows.map(mapWorkItemCommentRow);
}

export async function fetchWorkItemComments(workItemId: string): Promise<WorkItemComment[]> {
  return await getWorkItemComments(workItemId);
}

async function getWorkItemCommentById(id: string): Promise<WorkItemComment | null> {
  const result = await query<WorkItemCommentRow>(
    `
      SELECT
        c.id,
        c.work_item_id,
        c.user_id,
        c.content,
        c.created_at,
        c.updated_at,
        u.first_name AS user_first_name,
        u.last_name AS user_last_name,
        u.username AS user_username,
        u.avatar_color AS user_avatar_color
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.id = $1
    `,
    [id]
  );
  const row = result.rows[0];
  return row ? mapWorkItemCommentRow(row) : null;
}

async function ensureWorkItemHydrated(workItem: WorkItem): Promise<WorkItem> {
  const [tags, comments, assignee] = await Promise.all([
    getWorkItemTags(workItem.id),
    getWorkItemComments(workItem.id),
    workItem.assignee
      ? Promise.resolve(workItem.assignee)
      : workItem.assignee_id
      ? UserService.getUserById(workItem.assignee_id)
      : Promise.resolve(null),
  ]);

  return {
    ...workItem,
    tags,
    comments,
    assignee,
  };
}

async function insertSubtypeRow(client: Queryable, workItemId: string, type: WorkItemType): Promise<void> {
  const table = getSubtypeTableName(type);
  await client.query(`INSERT INTO ${table} (work_item_id) VALUES ($1) ON CONFLICT (work_item_id) DO NOTHING`, [
    workItemId,
  ]);
  const oppositeTable = type === "BUG" ? "task_items" : "bug_items";
  await client.query(`DELETE FROM ${oppositeTable} WHERE work_item_id = $1`, [workItemId]);
}

export async function createWorkItem(
  input: CreateWorkItemInput,
  options?: MutationOptions
): Promise<WorkItem> {
  const normalizedType = assertWorkItemType(input.type);
  const normalizedStatus = sanitizeWorkItemStatus(input.status ?? null);
  const normalizedDescription = input.description?.trim() ?? null;
  const normalizedDueDate = normalizeDate(input.due_date ?? null);
  const normalizedTitle = input.title.trim();

  if (!normalizedTitle) {
    throw new Error("title is required for a work item");
  }

  if (!input.project_id) {
    throw new Error("project_id is required");
  }

  if (!input.team_id) {
    throw new Error("team_id is required");
  }

  if (normalizedType === "TASK" || normalizedType === "BUG") {
    const taskKind =
      normalizedType === "BUG"
        ? "BUG"
        : sanitizeTaskKind(input.task_kind ?? "GENERAL");

    const task = await createTask(
      {
        project_id: input.project_id,
        team_id: input.team_id,
        stage_id: input.stage_id,
        backlog_id: input.backlog_id,
        sprint_id: input.sprint_id,
        title: normalizedTitle,
        description: normalizedDescription,
        due_date: normalizedDueDate,
        priority: input.priority ?? null,
        estimate: input.estimate ?? null,
        status: normalizedStatus,
        task_kind: taskKind,
        bug_details: normalizedType === "BUG" ? input.bug_details ?? null : null,
        issue_details: taskKind === "ISSUE" ? input.issue_details ?? null : null,
      },
      options
    );

    if (input.parent_id) {
      await linkWorkItems(input.parent_id, task.id);
    }

    const workItem = await getWorkItemById(task.id);
    if (!workItem) {
      throw new Error("Failed to load created work item");
    }
    return workItem;
  }

  const workItemId = await withTransaction(async (client) => {
    const positionResult = await client.query<{ pos: number }>(
      `
        SELECT COALESCE(MAX(position) + 1, 0) AS pos
        FROM work_items
        WHERE project_id = $1 AND team_id = $2 AND type = $3::work_item_type
      `,
      [input.project_id, input.team_id, normalizedType]
    );
    const nextPosition = positionResult.rows[0]?.pos ?? 0;

    const insertResult = await client.query<{ id: string }>(
      `
        INSERT INTO work_items (
          project_id,
          team_id,
          backlog_id,
          sprint_id,
          stage_id,
          assignee_id,
          type,
          task_kind,
          title,
          description,
          status,
          priority,
          estimate,
          due_date,
          position
        ) VALUES (
          $1,
          $2,
          $3::uuid,
          $4::uuid,
          $5::uuid,
          $6::uuid,
          $7::work_item_type,
          NULL,
          $8,
          $9,
          $10,
          $11,
          $12,
          COALESCE($13::DATE, NULL),
          $14
        )
        RETURNING id
      `,
      [
        input.project_id,
        input.team_id,
        input.backlog_id ?? null,
        input.sprint_id ?? null,
        input.stage_id ?? null,
        input.assignee_id ?? null,
        normalizedType,
        normalizedTitle,
        normalizedDescription,
        normalizedStatus,
        input.priority ?? null,
        input.estimate ?? null,
        normalizedDueDate,
        nextPosition,
      ]
    );

    const createdId = insertResult.rows[0]?.id;
    if (!createdId) {
      throw new Error("Failed to create work item");
    }

    await insertSubtypeRow(client, createdId, normalizedType);

    if (input.parent_id) {
      await ensureChildHasAtMostOneParent(client, createdId, input.parent_id);
      await client.query(
        `
          INSERT INTO work_item_links (parent_id, child_id)
          VALUES ($1, $2)
          ON CONFLICT (parent_id, child_id) DO NOTHING
        `,
        [input.parent_id, createdId]
      );
    }

    return createdId;
  });

  const workItem = await getWorkItemById(workItemId);
  if (!workItem) {
    throw new Error("Failed to load created work item");
  }
  return workItem;
}

export async function updateWorkItem(
  id: string,
  input: UpdateWorkItemInput
): Promise<WorkItem> {
  return await withTransaction(async (client) => {
    const existingResult = await client.query<{
      id: string;
      title: string | null;
      description: string | null;
      status: string;
      priority: string | null;
      estimate: number | null;
      due_date: Date | string | null;
    }>(
      `
        SELECT
          id,
          title,
          description,
          status,
          priority,
          estimate,
          due_date
        FROM work_items
        WHERE id = $1
        FOR UPDATE
      `,
      [id]
    );
    const existing = existingResult.rows[0];
    if (!existing) {
      throw new Error("Work item not found");
    }

    const capturedTitle = input.title !== undefined ? input.title ?? "" : existing.title ?? "";
    const nextTitle = capturedTitle.trim();
    if (!nextTitle) {
      throw new Error("Title is required for a work item.");
    }

    const nextDescription =
      input.description !== undefined ? input.description ?? null : existing.description ?? null;
    const nextStatus = sanitizeWorkItemStatus(input.status ?? existing.status);
    const nextPriority =
      input.priority !== undefined
        ? (input.priority?.trim().length ? input.priority.trim() : null)
        : existing.priority ?? null;
    const nextEstimate =
      input.estimate !== undefined ? input.estimate : existing.estimate ?? null;
    const nextDueDate =
      input.due_date !== undefined ? normalizeDate(input.due_date) : existing.due_date ?? null;

    await client.query(
      `
        UPDATE work_items
        SET
          title = $2,
          description = $3,
          status = $4,
          priority = $5,
          estimate = $6,
          due_date = COALESCE($7::DATE, NULL),
          updated_at = now()
        WHERE id = $1
      `,
      [
        id,
        nextTitle,
        nextDescription,
        nextStatus,
        nextPriority,
        nextEstimate,
        nextDueDate,
      ]
    );

    const updatedItem = await getWorkItemById(id);
    if (!updatedItem) {
      throw new Error("Work item not found after update");
    }
    return updatedItem;
  });
}

export async function setWorkItemAssignee(
  work_item_id: string,
  assignee_id: string | null
): Promise<WorkItem> {
  await query(
    `
      UPDATE work_items
      SET assignee_id = $2,
          updated_at = now()
      WHERE id = $1
    `,
    [work_item_id, assignee_id]
  );

  const item = await getWorkItemById(work_item_id);
  if (!item) throw new Error("Work item not found");
  return item;
}

export async function assignTagToWorkItem(
  work_item_id: string,
  tag_id: string
): Promise<WorkItem> {
  await query(
    `
      INSERT INTO work_item_tags (work_item_id, tag_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `,
    [work_item_id, tag_id]
  );

  const item = await getWorkItemById(work_item_id);
  if (!item) throw new Error("Work item not found");
  return item;
}

export async function removeTagFromWorkItem(
  work_item_id: string,
  tag_id: string
): Promise<WorkItem> {
  await query(
    `
      DELETE FROM work_item_tags
      WHERE work_item_id = $1 AND tag_id = $2
    `,
    [work_item_id, tag_id]
  );

  const item = await getWorkItemById(work_item_id);
  if (!item) throw new Error("Work item not found");
  return item;
}

export async function addWorkItemComment(
  work_item_id: string,
  user_id: string,
  content: string
): Promise<WorkItemComment> {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Comment cannot be empty.");
  }

  const insert = await query<{ id: string }>(
    `
      INSERT INTO comments (work_item_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING id
    `,
    [work_item_id, user_id, trimmed]
  );

  const commentId = insert.rows[0]?.id;
  if (!commentId) throw new Error("Failed to create comment");

  const comment = await getWorkItemCommentById(commentId);
  if (!comment) throw new Error("Comment not found after creation");
  return comment;
}

export async function updateWorkItemComment(
  id: string,
  user_id: string,
  content: string
): Promise<WorkItemComment> {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Comment cannot be empty.");
  }

  const result = await query(
    `
      UPDATE comments
      SET content = $2,
          updated_at = now()
      WHERE id = $1 AND user_id = $3
    `,
    [id, trimmed, user_id]
  );

  if (result.rowCount === 0) {
    throw new Error("Comment not found or permission denied");
  }

  const comment = await getWorkItemCommentById(id);
  if (!comment) throw new Error("Comment not found after update");
  return comment;
}

export async function deleteWorkItemComment(
  id: string,
  user_id: string
): Promise<boolean> {
  const result = await query(
    `
      DELETE FROM comments
      WHERE id = $1 AND user_id = $2
    `,
    [id, user_id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function linkWorkItems(parent_id: string, child_id: string): Promise<boolean> {
  if (parent_id === child_id) {
    throw new Error("A work item cannot be linked to itself.");
  }

  const insertResult = await withTransaction(async (client) => {
    await ensureChildHasAtMostOneParent(client, child_id, parent_id);
    return client.query(
      `
        INSERT INTO work_item_links (parent_id, child_id)
        VALUES ($1, $2)
        ON CONFLICT (parent_id, child_id) DO NOTHING
      `,
      [parent_id, child_id]
    );
  });

  return (insertResult.rowCount ?? 0) > 0;
}

export async function unlinkWorkItems(parent_id: string, child_id: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM work_item_links WHERE parent_id = $1 AND child_id = $2`,
    [parent_id, child_id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getWorkItemChildren(id: string): Promise<WorkItem[]> {
  return await listWorkItems({ parent_id: id });
}

export async function getWorkItemParent(id: string): Promise<WorkItem | null> {
  const result = await query<{ parent_id: string }>(
    `SELECT parent_id FROM work_item_links WHERE child_id = $1 LIMIT 1`,
    [id]
  );
  const parentId = result.rows[0]?.parent_id;
  if (!parentId) return null;
  return await getWorkItemById(parentId);
}

export async function getWorkItemTask(id: string): Promise<Task | null> {
  return await getTaskById(id);
}
