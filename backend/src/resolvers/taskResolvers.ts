import * as TaskService from "../services/TaskService.js";

export const taskResolvers = {
  Query: {
    tasks: async (_: unknown, args: { projectId: string }) => await TaskService.getTasks(args.projectId),
  },
  Mutation: {
    addTask: async (
      _: unknown,
      { projectId, title, description, dueDate, priority, status }: {
        projectId: string,
        title: string;
        description?: string;
        dueDate?: string;
        priority?: string;
        status?: string;
      }
    ) => {
      return await TaskService.addTask({
        projectId,
        title,
        description,
        dueDate,
        priority,
        status,
      });
    },

    deleteTask: async (_: unknown, { id }: { id: string }) =>
      await TaskService.deleteTask(id),

    updateTaskPriority: async (_: unknown, { id, priority }: { id: string; priority: string }) =>
      await TaskService.updateTaskPriority(id, priority),
    
    updateTaskStatus: async (_: unknown, { id, status }: { id: string; status: string }) =>
      await TaskService.updateTaskStatus(id, status),
    updateTask: async (_: unknown,
    {
      id,
      title,
      description,
      dueDate,
      priority,
      status,
    }: {
      id: string;
      title?: string;
      description?: string;
      dueDate?: string;
      priority?: string;
      status?: string;
    }
  ) => await TaskService.updateTask(id, title, description, dueDate, priority, status),
  },
}