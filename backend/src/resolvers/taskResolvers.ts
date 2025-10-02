import * as TaskService from "../services/TaskService.js";
import * as CommentService from "../services/CommentService.js";
import * as StageService from "../services/StageService.js";
import type { Task } from "@shared/types";
import type { GraphQLContext } from "../types/context";

export const taskResolvers = {
  Query: {
    tasks: async (
      _: unknown,
      args: { stage_id?: string; workflow_id?: string; project_id?: string },
      ctx: GraphQLContext
    ): Promise<Task[]> => {
      return await TaskService.getTasks(args, ctx.user?.id ?? null);
    },

    task: async (
      _: unknown,
      { id }: { id: string },
      _ctx: GraphQLContext
    ): Promise<Task | null> => {
      return await TaskService.getTaskById(id);
    },
  },

  Mutation: {
    createTask: async (
      _: unknown,
      {
        stage_id,
        title,
        description,
        due_date,
        priority,
        assigned_to,
      }: {
        stage_id: string;
        title: string;
        description?: string;
        due_date?: string;
        priority?: string;
        assigned_to?: string;
      },
      ctx: GraphQLContext
    ): Promise<Task> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await TaskService.createTask({
        stage_id,
        title,
        description,
        due_date,
        priority,
        assigned_to: assigned_to ?? null,
      });
    },

    updateTask: async (
      _: unknown,
      {
        id,
        title,
        description,
        due_date,
        priority,
        stage_id,
        assigned_to,
      }: {
        id: string;
        title?: string;
        description?: string;
        due_date?: string | null;
        priority?: string | null;
        stage_id?: string;
        assigned_to?: string | null;
      },
      ctx: GraphQLContext
    ): Promise<Task> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await TaskService.updateTask(id, {
        title,
        description,
        due_date,
        priority,
        stage_id,
        assigned_to: assigned_to ?? null,
      });
    },

    deleteTask: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await TaskService.deleteTask(id);
    },

    moveTask: async (
      _: unknown,
      { task_id, to_stage_id }: { task_id: string; to_stage_id: string },
      ctx: GraphQLContext
    ): Promise<Task> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await TaskService.moveTask(task_id, to_stage_id);
    },

    updateTaskPriority: async (
      _: unknown,
      { id, priority }: { id: string; priority: string },
      ctx: GraphQLContext
    ): Promise<Task> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await TaskService.updateTaskPriority(id, priority);
    },
  },

  Task: {
    comments: (parent: Task) => CommentService.getCommentsByTask(parent.id),
    stage: (parent: Task) => StageService.getStageById(parent.stage_id),
  },
};
