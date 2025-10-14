import * as ProjectService from "../services/ProjectService.js";
import * as WorkflowService from "../services/WorkflowService.js";
import * as TeamService from "../services/TeamService.js";
import * as BacklogService from "../services/BacklogService.js";
import * as SprintService from "../services/SprintService.js";
import type { Project, Workflow, User, Team, Backlog, Sprint } from "../../../shared/types.js";
import { GraphQLContext } from "src/types/context";

export const projectResolvers = {
  Query: {
    projects: async (
      _: unknown,
      args: { team_id: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return ProjectService.getProjectsForTeam(args.team_id, ctx.user.id);
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
      args: { team_id: string; name: string; description?: string; is_public?: boolean },
      ctx: GraphQLContext
    ): Promise<Project> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await ProjectService.addProject(
        args.team_id,
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
      args: { team_id: string; project_ids: string[] },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await ProjectService.reorderProjects(args.team_id, args.project_ids, ctx.user.id);
    },
    leaveProject: async (
      _: unknown,
      args: { project_id: string },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await ProjectService.leaveProject(args.project_id, ctx.user.id);
    },
  },

  Project: {
    workflows: async (parent: Project, _: unknown, ctx: GraphQLContext): Promise<Workflow[]> => {
      return await WorkflowService.getWorkflowsByProject(parent.id, ctx.user?.id ?? null);
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
    team: async (parent: Project, _: unknown, ctx: GraphQLContext): Promise<Team | null> => {
      if (!ctx.user) return null;
      try {
        return await TeamService.getTeamById(parent.team_id, ctx.user.id);
      } catch {
        return null;
      }
    },
    backlogs: async (parent: Project, _: unknown, ctx: GraphQLContext): Promise<Backlog[]> => {
      if (!ctx.user) return [];
      const hasAccess = await ProjectService.userHasProjectAccess(parent.id, ctx.user.id);
      if (!hasAccess) return [];
      return await BacklogService.getBacklogsForProject(parent.id);
    },
    sprints: async (parent: Project, _: unknown, ctx: GraphQLContext): Promise<Sprint[]> => {
      if (!ctx.user) return [];
      const hasAccess = await ProjectService.userHasProjectAccess(parent.id, ctx.user.id);
      if (!hasAccess) return [];
      return await SprintService.getSprintsByProject(parent.id);
    },
  },
};
