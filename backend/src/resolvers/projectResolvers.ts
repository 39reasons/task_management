import * as ProjectService from "../services/ProjectService.js";
import * as BoardService from "../services/BoardService.js";
import * as TeamService from "../services/TeamService.js";
import type { Project, Board, User, Team } from "../../../shared/types.js";
import { GraphQLContext } from "src/types/context";

export const projectResolvers = {
  Query: {
    projects: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return ProjectService.getProjects(ctx.user.id);
    },
    project: async (_: unknown, args: { id: string }, ctx: GraphQLContext): Promise<Project> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await ProjectService.getProjectById(args.id, ctx.user.id);
    },
    projectMembers: async (
      _: unknown,
      { project_id }: { project_id: string },
      ctx: GraphQLContext
    ): Promise<User[]> => {
      if (!ctx.user) throw new Error("Not authenticated");
      const hasAccess = await ProjectService.userHasProjectAccess(project_id, ctx.user.id);
      if (!hasAccess) throw new Error("Project not found or not accessible");
      return await ProjectService.getProjectMembers(project_id);
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

    reorderProjects: async (
      _: unknown,
      args: { project_ids: string[] },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await ProjectService.reorderProjects(args.project_ids, ctx.user.id);
    },
    leaveProject: async (
      _: unknown,
      args: { project_id: string },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await ProjectService.leaveProject(args.project_id, ctx.user.id);
    },
    removeProjectMember: async (
      _: unknown,
      args: { project_id: string; user_id: string },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await ProjectService.removeProjectMember(args.project_id, args.user_id, ctx.user.id);
    },
  },

  Project: {
    boards: async (parent: Project, _: unknown, ctx: GraphQLContext): Promise<Board[]> => {
      return await BoardService.getBoardsByProject(parent.id, ctx.user?.id ?? null);
    },
    teams: async (parent: Project, _: unknown, ctx: GraphQLContext): Promise<Team[]> => {
      if (!ctx.user) return [];
      return await TeamService.getTeamsForUser(ctx.user.id, parent.id);
    },
    members: async (parent: Project, _: unknown, ctx: GraphQLContext): Promise<User[]> => {
      if (!ctx.user) return [];
      const hasAccess = await ProjectService.userHasProjectAccess(parent.id, ctx.user.id);
      if (!hasAccess) return [];
      return await ProjectService.getProjectMembers(parent.id);
    },
    viewer_is_owner: (parent: Project): boolean => {
      if (parent.viewer_is_owner !== undefined) {
        return parent.viewer_is_owner;
      }
      return parent.viewer_role === "owner";
    },
    viewer_role: (parent: Project): Project["viewer_role"] => parent.viewer_role ?? null,
  },
};
