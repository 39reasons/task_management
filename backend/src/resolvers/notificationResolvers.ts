import * as NotificationService from "../services/NotificationService.js";
import * as ProjectService from "../services/ProjectService.js";
import type { GraphQLContext } from "../types/context";
import type { Notification } from "@shared/types";

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
  },
};
