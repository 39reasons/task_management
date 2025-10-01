import * as TaskService from "../services/TaskService.js";
import * as CommentService from "../services/CommentService.js";
import type { Task } from "@shared/types";
import type { GraphQLContext } from "../types/context";

export const taskResolvers = {
  Query: {
    tasks: async (
      _: unknown,
      args: { projectId?: string },
      ctx: GraphQLContext
    ): Promise<Task[]> => {
      if (args.projectId) {
        return await TaskService.getTasks(args.projectId, ctx.user?.id ?? null);
      } else {
        return await TaskService.getAllVisibleTasks(ctx.user?.id ?? null);
      }
    },

    task: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ): Promise<Task | null> => {
      return await TaskService.getTaskById(id);
    },
  },

  Mutation: {
    addTask: async (
      _: unknown,
      { projectId, title, status }: { projectId: string; title: string; status: string },
      ctx: GraphQLContext
    ): Promise<Task> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await TaskService.addTask({
        projectId,
        title,
        status,
      });
    },

    updateTask: async (
      _: unknown,
      {
        id,
        title,
        description,
        dueDate,
        priority,
        status,
        assignedTo,
      }: {
        id: string;
        title?: string;
        description?: string;
        dueDate?: string;
        priority?: string;
        status?: string;
        assignedTo?: string;
      },
      ctx: GraphQLContext
    ): Promise<Task> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await TaskService.updateTask(
        id,
        title,
        description,
        dueDate,
        priority,
        status,
        assignedTo ?? ctx.user.id
      );
    },

    deleteTask: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await TaskService.deleteTask(id);
    },

    updateTaskPriority: async (
      _: unknown,
      { id, priority }: { id: string; priority: string },
      ctx: GraphQLContext
    ): Promise<Task> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await TaskService.updateTaskPriority(id, priority);
    },

    updateTaskStatus: async (
      _: unknown,
      { id, status }: { id: string; status: string },
      ctx: GraphQLContext
    ): Promise<Task> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await TaskService.updateTaskStatus(id, status);
    },
  },

  Task: {
    comments: (parent: Task) => CommentService.getCommentsByTask(parent.id),
  },
};
