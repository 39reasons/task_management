import * as TagService from "../services/TagService.js";
import * as TaskService from "../services/TaskService.js";
import type { GraphQLContext } from "../types/context";
import type { Task } from "../../../shared/types.js";

export const tagResolvers = {
  Task: {
    tags: async (parent: Task) => {
      return await TagService.getTagsForTask(parent.id);
    },
  },
  Query: {
    tags: async (
      _: unknown,
      { project_id }: { project_id: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await TagService.getAllTags(project_id);
    },
  },
  Mutation: {
    addTag: async (
      _: unknown,
      { project_id, name, color }: { project_id: string; name: string; color?: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Not authenticated");
      const tag = await TagService.addTag(project_id, name, color);
      if (!tag) throw new Error("Failed to create tag");
      return tag;
    },

    addTagToTask: async (
      _: unknown,
      { task_id, name, color }: { task_id: string; name: string; color?: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Not authenticated");

      const task = await TaskService.getTaskById(task_id);
      if (!task) throw new Error("Task not found");

      await TagService.addTagToTask(task_id, task.project_id, name, color);
      return await TaskService.notifyTaskUpdated(task_id, ctx.clientId ?? null);
    },

    assignTagToTask: async (
      _: unknown,
      { task_id, tag_id }: { task_id: string; tag_id: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Not authenticated");
      await TagService.assignTagToTask(task_id, tag_id);
      return await TaskService.notifyTaskUpdated(task_id, ctx.clientId ?? null);
    },

    removeTagFromTask: async (
      _: unknown,
      { task_id, tag_id }: { task_id: string; tag_id: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Not authenticated");
      await TagService.removeTagFromTask(task_id, tag_id);
      return await TaskService.notifyTaskUpdated(task_id, ctx.clientId ?? null);
    },

    updateTag: async (
      _: unknown,
      { id, name, color }: { id: string; name: string; color?: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Not authenticated");
      const tag = await TagService.updateTag(id, name, color);
      if (!tag) throw new Error("Tag not found");
      return tag;
    },
  },
};
