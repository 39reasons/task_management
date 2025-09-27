import * as TaskService from "../services/TaskService.js";

export const taskResolvers = {
  Query: {
    tasks: async () => await TaskService.getTasks(),
  },
  Mutation: {
    addTask: async (
      _: unknown,
      { title, description, dueDate, priority, status }: {
        title: string;
        description?: string;
        dueDate?: string;
        priority?: string;
        status?: string;
      }
    ) => {
      return await TaskService.addTask({
        title,
        description,
        dueDate,
        priority,
        status,
      });
    },

    toggleTask: async (_: unknown, { id }: { id: string }) =>
      await TaskService.toggleTask(id),

    deleteTask: async (_: unknown, { id }: { id: string }) =>
      await TaskService.deleteTask(id),
    
    updateTaskPriority: async (_: unknown, { id, priority }: { id: string; priority: string }) =>
      await TaskService.updateTaskPriority(id, priority),

    },
}