import * as TeamService from "../services/TeamService.js";
import * as ProjectService from "../services/ProjectService.js";
import * as BoardService from "../services/BoardService.js";
import * as BacklogService from "../services/BacklogService.js";
import * as SprintService from "../services/SprintService.js";
import * as TaskService from "../services/TaskService.js";
import type { GraphQLContext } from "../types/context";
import type { Team, Project, TeamMember, Board, Backlog, Sprint, Task } from "../../../shared/types.js";

export const teamResolvers = {
  Query: {
    teams: async (_: unknown, args: { project_id?: string }, ctx: GraphQLContext): Promise<Team[]> => {
      if (!ctx.user) {
        throw new Error("Not authenticated");
      }
      return await TeamService.getTeamsForUser(ctx.user.id, args.project_id);
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
      args: { project_id: string; name: string; description?: string | null },
      ctx: GraphQLContext
    ): Promise<Team> => {
      if (!ctx.user) {
        throw new Error("Not authenticated");
      }
      return await TeamService.createTeam(
        args.project_id,
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
    removeTeamMember: async (
      _: unknown,
      args: { team_id: string; user_id: string },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) {
        throw new Error("Not authenticated");
      }
      return await TeamService.removeTeamMember(args.team_id, args.user_id, ctx.user.id);
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
    project: async (parent: Team, _: unknown, ctx: GraphQLContext): Promise<Project | null> => {
      if (!ctx.user) {
        return null;
      }
      try {
        return await ProjectService.getProjectById(parent.project_id, ctx.user.id);
      } catch {
        return null;
      }
    },
    boards: async (parent: Team, _: unknown, ctx: GraphQLContext): Promise<Board[]> => {
      const boards = await BoardService.getBoardsByProject(parent.project_id, ctx.user?.id ?? null);
      return boards.filter((board) => board.team_id === parent.id);
    },
    backlogs: async (parent: Team, _: unknown, ctx: GraphQLContext): Promise<Backlog[]> => {
      if (!ctx.user) {
        return [];
      }
      return await BacklogService.getBacklogsForTeam(parent.id, ctx.user.id);
    },
    sprints: async (parent: Team, _: unknown, ctx: GraphQLContext): Promise<Sprint[]> => {
      if (!ctx.user) {
        return [];
      }
      return await SprintService.getSprintsByFilter({ team_id: parent.id });
    },
    tasks: async (parent: Team, _: unknown, ctx: GraphQLContext): Promise<Task[]> => {
      return await TaskService.getTasks({ team_id: parent.id }, ctx.user?.id ?? null);
    },
  },
};
