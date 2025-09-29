import * as TaskService from "../services/TaskService.js";
import type { Task } from "@shared/types";

export const taskResolvers = {
  Query: {
    tasks: async (
      _: unknown,
      args: { projectId?: string },
      { user }: any
    ): Promise<Task[]> => {
      if (args.projectId) {
        return await TaskService.getTasks(args.projectId, user?.id || null);
      } else {
        return await TaskService.getAllVisibleTasks(user?.id || null);
      }
    },
  },

  Mutation: {
    addTask: async (
      _: unknown,
      {
        projectId,
        title,
        description,
        dueDate,
        priority,
        status,
        assignedTo,
      }: {
        projectId: string;
        title: string;
        description?: string;
        dueDate?: string;
        priority?: string;
        status?: string;
        assignedTo?: string;
      },
      { user }: any
    ): Promise<Task> => {
      if (!user) throw new Error("Not authenticated");
      return await TaskService.addTask({
        projectId,
        title,
        description,
        dueDate,
        priority,
        status,
        assignedTo,
      });
    },

    deleteTask: async (_: unknown, { id }: { id: string }, { user }: any) => {
      if (!user) throw new Error("Not authenticated");
      return await TaskService.deleteTask(id);
    },

    updateTaskPriority: async (
      _: unknown,
      { id, priority }: { id: string; priority: string },
      { user }: any
    ) => {
      if (!user) throw new Error("Not authenticated");
      return await TaskService.updateTaskPriority(id, priority);
    },

    updateTaskStatus: async (
      _: unknown,
      { id, status }: { id: string; status: string },
      { user }: any
    ) => {
      if (!user) throw new Error("Not authenticated");
      return await TaskService.updateTaskStatus(id, status);
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
      { user }: any
    ) => {
      if (!user) throw new Error("Not authenticated");
      return await TaskService.updateTask(
        id,
        title,
        description,
        dueDate,
        priority,
        status,
        assignedTo
      );
    },
  },
};
