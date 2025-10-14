import * as BacklogService from "../services/BacklogService.js";
import * as TaskService from "../services/TaskService.js";
import type { GraphQLContext } from "../types/context";
import type { Backlog, Task } from "../../../shared/types.js";

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
    tasks: async (parent: Backlog, _args: unknown, ctx: GraphQLContext): Promise<Task[]> => {
      return await TaskService.getTasks({ backlog_id: parent.id }, ctx.user?.id ?? null);
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
  },
};
