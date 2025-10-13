import * as BacklogService from "../services/BacklogService.js";
import * as BacklogTaskService from "../services/BacklogTaskService.js";
import * as TeamService from "../services/TeamService.js";
import type { GraphQLContext } from "../types/context";
import type { Backlog, BacklogTask } from "../../../shared/types.js";

export const backlogResolvers = {
  Query: {
    backlogs: async (
      _: unknown,
      args: { team_id: string },
      ctx: GraphQLContext
    ): Promise<Backlog[]> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await BacklogService.getBacklogsForTeam(args.team_id, ctx.user.id);
    },
  },
  Backlog: {
    tasks: async (parent: Backlog, _args: unknown, ctx: GraphQLContext): Promise<BacklogTask[]> => {
      if (!ctx.user) return [];
      try {
        const membership = await TeamService.getTeamMembership(parent.team_id, ctx.user.id);
        if (!membership) {
          return [];
        }
      } catch {
        return [];
      }
      return await BacklogTaskService.getTasksForBacklog(parent.id);
    },
  },
  Mutation: {
    addBacklog: async (
      _: unknown,
      args: { team_id: string; name: string; description?: string | null; position?: number | null },
      ctx: GraphQLContext
    ): Promise<Backlog> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await BacklogService.createBacklog(
        args.team_id,
        ctx.user.id,
        args.name,
        args.description ?? null,
        args.position ?? null
      );
    },
    updateBacklog: async (
      _: unknown,
      args: { id: string; name?: string; description?: string | null; position?: number | null },
      ctx: GraphQLContext
    ): Promise<Backlog> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await BacklogService.updateBacklog(
        args.id,
        ctx.user.id,
        args.name,
        args.description ?? null,
        args.position ?? null
      );
    },
    deleteBacklog: async (
      _: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await BacklogService.deleteBacklog(args.id, ctx.user.id);
    },
    addBacklogTask: async (
      _: unknown,
      args: { backlog_id: string; title: string; description?: string | null; status?: string | null },
      ctx: GraphQLContext
    ): Promise<BacklogTask> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await BacklogTaskService.createBacklogTask(
        args.backlog_id,
        ctx.user.id,
        args.title,
        args.description ?? null,
        args.status ?? null
      );
    },
    updateBacklogTask: async (
      _: unknown,
      args: { id: string; title?: string; description?: string | null; status?: string | null; position?: number | null },
      ctx: GraphQLContext
    ): Promise<BacklogTask> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await BacklogTaskService.updateBacklogTask(args.id, ctx.user.id, {
        title: args.title,
        description: args.description ?? null,
        status: args.status ?? null,
        position: args.position ?? null,
      });
    },
    deleteBacklogTask: async (
      _: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await BacklogTaskService.deleteBacklogTask(args.id, ctx.user.id);
    },
  },
};
