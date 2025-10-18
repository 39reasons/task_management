import * as SprintService from "../services/SprintService.js";
import * as ProjectService from "../services/ProjectService.js";
import * as TeamService from "../services/TeamService.js";
import type { Sprint } from "../../../shared/types.js";
import type { GraphQLContext } from "../types/context";

export const sprintResolvers = {
  Query: {
    sprints: async (
      _: unknown,
      { project_id, team_id }: { project_id?: string | null; team_id?: string | null },
      ctx: GraphQLContext
    ): Promise<Sprint[]> => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (!project_id && !team_id) {
        throw new Error("Provide a project or team identifier.");
      }

      if (project_id) {
        const hasAccess = await ProjectService.userHasProjectAccess(project_id, ctx.user.id);
        if (!hasAccess) {
          throw new Error("Project not found or not accessible");
        }
      }

      if (team_id) {
        const membership = await TeamService.getTeamMembership(team_id, ctx.user.id);
        if (!membership) {
          throw new Error("Team not found or not accessible");
        }
      }

      return await SprintService.getSprintsByFilter({
        project_id: project_id ?? undefined,
        team_id: team_id ?? undefined,
      });
    },
  },
};
