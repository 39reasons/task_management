import * as TaskService from "../services/TaskService.js";

export const taskResolvers = {
  Query: {
    tasks: async () => await TaskService.getTasks(),
  },
  Mutation: {
    addTask: async (_: unknown, { title }: { title: string }) =>
      await TaskService.addTask(title),

    toggleTask: async (_: unknown, { id }: { id: string }) =>
      await TaskService.toggleTask(id),

    deleteTask: async (_: unknown, { id }: { id: string }) =>
      await TaskService.deleteTask(id),
  },
};
