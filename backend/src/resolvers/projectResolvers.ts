import * as ProjectService from "../services/ProjectService.js";
import type { Project } from "@shared/types";

export const projectResolvers = {
  Query: {
    projects: async (_: unknown, __: unknown, { user }: any) => {
      return await ProjectService.getProjects(user?.id);
    },
    project: async (_: unknown, args: { id: string }, { user }: any): Promise<Project> => {
      if (!user) throw new Error("Not authenticated");
      return await ProjectService.getProjectById(args.id, user.id);
    },
  },

  Mutation: {
  addProject: async (
    _: unknown,
    args: { name: string; description?: string; is_public?: boolean },
    { user }: any
  ): Promise<Project> => {
    if (!user) throw new Error("Not authenticated");
    return await ProjectService.addProject(
      args.name,
      args.description ?? null,
      args.is_public ?? false,
      user.id
    );
  },

  updateProject: async (
    _: unknown,
    args: { id: string; name?: string; description?: string; is_public?: boolean },
    { user }: any
  ): Promise<Project> => {
    if (!user) throw new Error("Not authenticated");
    return await ProjectService.updateProject(
      args.id,
      user.id,
      args.name,
      args.description,
      args.is_public
    );
  },
    deleteProject: async (
      _: unknown,
      args: { id: string },
      { user }: any
    ): Promise<boolean> => {
      if (!user) throw new Error("Not authenticated");
      return await ProjectService.deleteProject(args.id, user.id);
    },
  },
};
