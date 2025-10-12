import { query } from "../db/index.js";
import { publishNotificationEvent } from "../events/notificationPubSub.js";
import type { Notification, User, Project } from "../../../shared/types.js";

function mapNotificationRow(row: any): Notification {
  const created_at = normalizeTimestamp(row.created_at);
  const updated_at = normalizeTimestamp(row.updated_at);

  return {
    id: row.id,
    message: row.message,
    type: row.type,
    status: row.status,
    is_read: row.is_read,
    recipient_id: row.recipient_id,
    team_id: row.project_team_id ?? null,
    created_at,
    updated_at,
    project: row.project_id
      ? {
          id: row.project_id,
          team_id: row.project_team_id,
          name: row.project_name,
          description: row.project_description,
          created_at: row.project_created_at,
          updated_at: row.project_updated_at,
          is_public: row.project_is_public,
          viewer_role: null,
          viewer_is_owner: false,
        } as Project
      : null,
    sender: row.sender_id
      ? {
          id: row.sender_id,
          first_name: row.sender_first_name,
          last_name: row.sender_last_name,
          username: row.sender_username,
          avatar_color: row.sender_avatar_color,
        } as User
      : null,
  };
}

function normalizeTimestamp(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export async function getNotificationsForUser(user_id: string): Promise<Notification[]> {
  const result = await query(
    `
    SELECT
      n.id,
      n.message,
      n.type,
      n.status,
      n.is_read,
      n.recipient_id,
      n.created_at,
      n.updated_at,
      n.project_id,
      p.team_id AS project_team_id,
      p.name AS project_name,
      p.description AS project_description,
      p.created_at AS project_created_at,
      p.updated_at AS project_updated_at,
      p.is_public AS project_is_public,
      n.sender_id,
      u.first_name AS sender_first_name,
      u.last_name AS sender_last_name,
      u.username AS sender_username,
      u.avatar_color AS sender_avatar_color
    FROM notifications n
    LEFT JOIN projects p ON p.id = n.project_id
    LEFT JOIN users u ON u.id = n.sender_id
    WHERE n.recipient_id = $1
    ORDER BY n.created_at DESC
    `,
    [user_id]
  );

  return result.rows.map(mapNotificationRow);
}

export async function getNotificationById(id: string): Promise<Notification | null> {
  const result = await query(
    `
    SELECT
      n.id,
      n.message,
      n.type,
      n.status,
      n.is_read,
      n.recipient_id,
      n.created_at,
      n.updated_at,
      n.project_id,
      p.team_id AS project_team_id,
      p.name AS project_name,
      p.description AS project_description,
      p.created_at AS project_created_at,
      p.updated_at AS project_updated_at,
      p.is_public AS project_is_public,
      n.sender_id,
      u.first_name AS sender_first_name,
      u.last_name AS sender_last_name,
      u.username AS sender_username,
      u.avatar_color AS sender_avatar_color
    FROM notifications n
    LEFT JOIN projects p ON p.id = n.project_id
    LEFT JOIN users u ON u.id = n.sender_id
    WHERE n.id = $1
    `,
    [id]
  );

  if (result.rowCount === 0) return null;
  return mapNotificationRow(result.rows[0]);
}

export async function sendProjectInvite(
  project_id: string,
  sender_id: string,
  username: string
): Promise<Notification> {
  const recipientRes = await query<{ id: string; first_name: string; last_name: string; username: string }>(
    `SELECT id, first_name, last_name, username FROM users WHERE username = $1`,
    [username]
  );

  if (recipientRes.rowCount === 0) {
    throw new Error("User not found");
  }

  const recipient = recipientRes.rows[0];

  // Prevent inviting if already member
  const projectRes = await query<{ name: string; team_id: string }>(
    `SELECT name, team_id FROM projects WHERE id = $1`,
    [project_id]
  );
  if (projectRes.rowCount === 0) {
    throw new Error("Project not found");
  }

  const teamId = projectRes.rows[0].team_id;

  const membershipRes = await query(
    `
    SELECT 1
    FROM team_members
    WHERE team_id = $1
      AND user_id = $2
      AND status = 'active'
    `,
    [teamId, recipient.id]
  );
  if (membershipRes.rowCount && membershipRes.rowCount > 0) {
    throw new Error("User is already a team member");
  }

  // Prevent duplicate pending invite
  const pendingRes = await query(
    `
    SELECT 1
    FROM notifications
    WHERE recipient_id = $1
      AND project_id = $2
      AND type = 'PROJECT_INVITE'
      AND status = 'pending'
    `,
    [recipient.id, project_id]
  );
  if (pendingRes.rowCount && pendingRes.rowCount > 0) {
    throw new Error("An invite is already pending for this user");
  }

  const message = `You have been invited to join ${projectRes.rows[0].name}.`;

  const insertRes = await query<{ id: string }>(
    `
    INSERT INTO notifications (recipient_id, sender_id, project_id, type, message)
    VALUES ($1, $2, $3, 'PROJECT_INVITE', $4)
    RETURNING id
    `,
    [recipient.id, sender_id, project_id, message]
  );

  await query(
    `
    INSERT INTO team_members (team_id, user_id, role, status)
    VALUES ($1, $2, 'member', 'invited')
    ON CONFLICT (team_id, user_id) DO UPDATE
      SET status = 'invited',
          updated_at = now()
    `,
    [teamId, recipient.id]
  );

  const notification = await getNotificationById(insertRes.rows[0].id);
  if (!notification) throw new Error("Failed to create notification");
  await publishNotificationEvent({
    type: "created",
    notification,
  });
  return notification;
}

export async function respondToNotification(
  id: string,
  user_id: string,
  accept: boolean
): Promise<Notification> {
  const notification = await getNotificationById(id);
  if (!notification) throw new Error("Notification not found");

  const notifRes = await query(
    `SELECT recipient_id, project_id, type FROM notifications WHERE id = $1`,
    [id]
  );

  if (notifRes.rowCount === 0) throw new Error("Notification not found");

  const { recipient_id, project_id, type } = notifRes.rows[0] as {
    recipient_id: string;
    project_id: string | null;
    type: string;
  };

  if (recipient_id !== user_id) {
    throw new Error("Not authorized to respond to this notification");
  }

  const status = accept ? "accepted" : "declined";

  await query(
    `
    UPDATE notifications
    SET status = $2,
        is_read = true,
        updated_at = now()
    WHERE id = $1
    `,
    [id, status]
  );

  if (accept && type === "PROJECT_INVITE" && project_id) {
    const projectRes = await query<{ team_id: string }>(
      `SELECT team_id FROM projects WHERE id = $1`,
      [project_id]
    );

    const teamId = projectRes.rows[0]?.team_id ?? null;
    if (teamId) {
      await query(
        `
        INSERT INTO team_members (team_id, user_id, role, status)
        VALUES ($1, $2, 'member', 'active')
        ON CONFLICT (team_id, user_id) DO UPDATE
          SET status = 'active',
              role = CASE
                WHEN team_members.role = 'owner' THEN team_members.role
                ELSE 'member'
              END,
              updated_at = now()
        `,
        [teamId, user_id]
      );
    }
  }

  const updated = await getNotificationById(id);
  if (!updated) throw new Error("Notification not found after update");
  await publishNotificationEvent({
    type: "updated",
    notification: updated,
  });
  return updated;
}

export async function markNotificationRead(
  id: string,
  user_id: string,
  read: boolean = true
): Promise<Notification> {
  await query(
    `
    UPDATE notifications
    SET is_read = $3,
        updated_at = now()
    WHERE id = $1 AND recipient_id = $2
    `,
    [id, user_id, read]
  );

  const updated = await getNotificationById(id);
  if (!updated) throw new Error("Notification not found");
  await publishNotificationEvent({
    type: "updated",
    notification: updated,
  });
  return updated;
}

export async function deleteNotification(id: string, user_id: string): Promise<boolean> {
  const existing = await getNotificationById(id);
  const result = await query(
    `DELETE FROM notifications WHERE id = $1 AND recipient_id = $2`,
    [id, user_id]
  );
  const deleted = (result.rowCount ?? 0) > 0;
  if (deleted) {
    await publishNotificationEvent({
      type: "deleted",
      notificationId: id,
      recipientId: existing?.recipient_id ?? null,
    });
  }
  return deleted;
}
