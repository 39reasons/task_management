import * as SprintService from "../services/SprintService.js";
import * as ProjectService from "../services/ProjectService.js";
import type { Sprint } from "../../../shared/types.js";
import type { GraphQLContext } from "../types/context";

export const sprintResolvers = {
  Query: {
    sprints: async (_: unknown, { project_id }: { project_id: string }, ctx: GraphQLContext): Promise<Sprint[]> => {
      if (!ctx.user) throw new Error("Not authenticated");
      const hasAccess = await ProjectService.userHasProjectAccess(project_id, ctx.user.id);
      if (!hasAccess) {
        throw new Error("Project not found or not accessible");
      }
      return await SprintService.getSprintsByProject(project_id);
    },
  },
};
