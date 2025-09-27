import * as TaskService from "../services/TaskService.js";

export const taskResolvers = {
  Query: {
    tasks: async () => await TaskService.getTasks(),
  },
  Mutation: {
  addTask: async (_: any, args: any, { dataSources }: any) => {
    const { title, description, dueDate, priority, status } = args;
    return dataSources.taskService.addTask({
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
  },
};
