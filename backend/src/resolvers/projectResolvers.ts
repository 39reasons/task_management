import * as ProjectService from "../services/ProjectService.js";
import type { Project } from "@shared/types";

export const projectResolvers = {
  Query: {
    projects: async (): Promise<Project[]> => {
      return await ProjectService.getProjects();
    },
    project: async (_: unknown, args: { id: string }): Promise<Project> => {
      return await ProjectService.getProjectById(args.id);
    },
  },

  Mutation: {
    addProject: async (
      _: unknown,
      args: { name: string; description?: string }
    ): Promise<Project> => {
      return await ProjectService.addProject(args.name, args.description);
    },
    deleteProject: async (_: unknown, args: { id: string }): Promise<boolean> => {
      return await ProjectService.deleteProject(args.id);
    },
  },
};
