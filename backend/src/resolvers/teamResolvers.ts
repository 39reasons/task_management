import * as TeamService from "../services/TeamService.js";
import * as ProjectService from "../services/ProjectService.js";
import type { GraphQLContext } from "../types/context";
import type { Team, Project, TeamMember } from "../../../shared/types.js";

export const teamResolvers = {
  Query: {
    teams: async (_: unknown, __: unknown, ctx: GraphQLContext): Promise<Team[]> => {
      if (!ctx.user) {
        throw new Error("Not authenticated");
      }
      return await TeamService.getTeamsForUser(ctx.user.id);
    },
    team: async (
      _: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ): Promise<Team> => {
      if (!ctx.user) {
        throw new Error("Not authenticated");
      }
      return await TeamService.getTeamById(args.id, ctx.user.id);
    },
  },

  Mutation: {
    createTeam: async (
      _: unknown,
      args: { name: string; description?: string | null },
      ctx: GraphQLContext
    ): Promise<Team> => {
      if (!ctx.user) {
        throw new Error("Not authenticated");
      }
      return await TeamService.createTeam(
        args.name,
        args.description ?? null,
        ctx.user.id
      );
    },
    updateTeam: async (
      _: unknown,
      args: { id: string; name?: string; description?: string | null },
      ctx: GraphQLContext
    ): Promise<Team> => {
      if (!ctx.user) {
        throw new Error("Not authenticated");
      }
      return await TeamService.updateTeam(
        args.id,
        ctx.user.id,
        args.name,
        args.description ?? undefined
      );
    },
    deleteTeam: async (
      _: unknown,
      args: { id: string },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) {
        throw new Error("Not authenticated");
      }
      return await TeamService.deleteTeam(args.id, ctx.user.id);
    },
    leaveTeam: async (
      _: unknown,
      args: { team_id: string },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) {
        throw new Error("Not authenticated");
      }
      return await TeamService.leaveTeam(args.team_id, ctx.user.id);
    },
  },

  Team: {
    members: async (parent: Team, _: unknown, ctx: GraphQLContext): Promise<TeamMember[]> => {
      if (!ctx.user) {
        return [];
      }
      const membership = await TeamService.getTeamMembership(parent.id, ctx.user.id);
      if (!membership) {
        return [];
      }
      return await TeamService.getTeamMembers(parent.id);
    },
    projects: async (parent: Team, _: unknown, ctx: GraphQLContext): Promise<Project[]> => {
      if (!ctx.user) {
        return [];
      }
      return await ProjectService.getProjectsForTeam(parent.id, ctx.user.id);
    },
  },
};
