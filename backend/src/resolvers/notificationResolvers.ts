import * as NotificationService from "../services/NotificationService.js";
import * as ProjectService from "../services/ProjectService.js";
import { createNotificationEventStream, type NotificationPubSubEvent } from "../events/notificationPubSub.js";
import type { GraphQLContext } from "../types/context";
import type { Notification } from "../../../shared/types.js";

type NotificationEventPayload = {
  action: "CREATED" | "UPDATED" | "DELETED";
  notification: Notification | null;
  notification_id: string | null;
};

export const notificationResolvers = {
  Query: {
    notifications: async (_: unknown, __: unknown, ctx: GraphQLContext): Promise<Notification[]> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await NotificationService.getNotificationsForUser(ctx.user.id);
    },
  },

  Mutation: {
    sendProjectInvite: async (
      _: unknown,
      { project_id, username }: { project_id: string; username: string },
      ctx: GraphQLContext
    ): Promise<Notification> => {
      if (!ctx.user) throw new Error("Not authenticated");
      const hasAccess = await ProjectService.userHasProjectAccess(project_id, ctx.user.id);
      if (!hasAccess) throw new Error("Project not found or not accessible");
      return await NotificationService.sendProjectInvite(project_id, ctx.user.id, username);
    },

    respondToNotification: async (
      _: unknown,
      { id, accept }: { id: string; accept: boolean },
      ctx: GraphQLContext
    ): Promise<Notification> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await NotificationService.respondToNotification(id, ctx.user.id, accept);
    },

    markNotificationRead: async (
      _: unknown,
      { id, read }: { id: string; read?: boolean },
      ctx: GraphQLContext
    ): Promise<Notification> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await NotificationService.markNotificationRead(id, ctx.user.id, read ?? true);
    },

    deleteNotification: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) throw new Error("Not authenticated");
      const deleted = await NotificationService.deleteNotification(id, ctx.user.id);
      if (!deleted) throw new Error("Notification not found");
      return true;
    },
  },

  Subscription: {
    notificationEvents: {
      subscribe: async (
        _: unknown,
        { recipient_id }: { recipient_id: string },
        ctx: GraphQLContext
      ) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.id !== recipient_id) {
          throw new Error("Not authorized to subscribe to these notifications");
        }
        return createNotificationEventStream(recipient_id);
      },
      resolve: (event: NotificationPubSubEvent): NotificationEventPayload => {
        switch (event.type) {
          case "created":
            return {
              action: "CREATED",
              notification: event.notification,
              notification_id: event.notification.id,
            };
          case "updated":
            return {
              action: "UPDATED",
              notification: event.notification,
              notification_id: event.notification.id,
            };
          case "deleted":
            return {
              action: "DELETED",
              notification: null,
              notification_id: event.notificationId,
            };
          default:
            return {
              action: "UPDATED",
              notification: null,
              notification_id: null,
            };
        }
      },
    },
  },
};
