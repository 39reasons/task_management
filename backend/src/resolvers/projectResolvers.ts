import * as ProjectService from "../services/ProjectService.js";
import * as WorkflowService from "../services/WorkflowService.js";
import type { Project, Workflow } from "@shared/types";
import { GraphQLContext } from "src/types/context";

export const projectResolvers = {
  Query: {
    projects: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      return ProjectService.getProjects(ctx.user?.id);
    },
    project: async (_: unknown, args: { id: string }, ctx: GraphQLContext): Promise<Project> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await ProjectService.getProjectById(args.id, ctx.user.id);
    },
  },

  Mutation: {
    addProject: async (
      _: unknown,
      args: { name: string; description?: string; is_public?: boolean },
      ctx: GraphQLContext
    ): Promise<Project> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await ProjectService.addProject(
        args.name,
        args.description ?? null,
        args.is_public ?? false,
        ctx.user.id
      );
    },

    updateProject: async (
      _: unknown,
      args: { id: string; name?: string; description?: string; is_public?: boolean },
      ctx: GraphQLContext
    ): Promise<Project> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await ProjectService.updateProject(
        args.id,
        ctx.user.id,
        args.name,
        args.description,
        args.is_public
      );
    },

    deleteProject: async (_: unknown, args: { id: string }, ctx: GraphQLContext): Promise<boolean> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await ProjectService.deleteProject(args.id, ctx.user.id);
    },
  },

  Project: {
    workflows: async (parent: Project, _: unknown, ctx: GraphQLContext): Promise<Workflow[]> => {
      return await WorkflowService.getWorkflowsByProject(parent.id, ctx.user?.id ?? null);
    },
  },
};
