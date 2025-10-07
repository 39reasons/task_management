import * as TaskService from "../services/TaskService.js";
import * as CommentService from "../services/CommentService.js";
import * as StageService from "../services/StageService.js";
import * as AIService from "../services/AIService.js";
import type { Task, TaskDraftSuggestion } from "../../../shared/types.js";
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
      }: {
        stage_id: string;
        title: string;
        description?: string;
        due_date?: string;
        priority?: string;
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
      }, {
        origin: ctx.clientId ?? null,
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
      }: {
        id: string;
        title?: string;
        description?: string;
        due_date?: string | null;
        priority?: string | null;
        stage_id?: string;
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
      }, {
        origin: ctx.clientId ?? null,
      });
    },

    deleteTask: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await TaskService.deleteTask(id, {
        origin: ctx.clientId ?? null,
      });
    },

    moveTask: async (
      _: unknown,
      { task_id, to_stage_id }: { task_id: string; to_stage_id: string },
      ctx: GraphQLContext
    ): Promise<Task> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await TaskService.moveTask(task_id, to_stage_id, {
        origin: ctx.clientId ?? null,
      });
    },

    updateTaskPriority: async (
      _: unknown,
      { id, priority }: { id: string; priority: string },
      ctx: GraphQLContext
    ): Promise<Task> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await TaskService.updateTaskPriority(id, priority, {
        origin: ctx.clientId ?? null,
      });
    },

    reorderTasks: async (
      _: unknown,
      { stage_id, task_ids }: { stage_id: string; task_ids: string[] },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) throw new Error("Not authenticated");
      await TaskService.reorderTasks(stage_id, task_ids, {
        origin: ctx.clientId ?? null,
      });
      return true;
    },

    setTaskMembers: async (
      _: unknown,
      { task_id, member_ids }: { task_id: string; member_ids: string[] },
      ctx: GraphQLContext
    ): Promise<Task> => {
      if (!ctx.user) throw new Error("Not authenticated");
      await TaskService.setTaskMembers(task_id, member_ids, {
        origin: ctx.clientId ?? null,
      });
      const task = await TaskService.getTaskById(task_id);
      if (!task) throw new Error("Task not found");
      return task;
    },

    generateTaskDraft: async (
      _: unknown,
      {
        input,
      }: {
        input: { prompt: string; project_id?: string | null; stage_id?: string | null };
      },
      ctx: GraphQLContext
    ): Promise<TaskDraftSuggestion> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await AIService.generateTaskDraft(
        {
          prompt: input.prompt,
          project_id: input.project_id ?? null,
          stage_id: input.stage_id ?? null,
        },
        {
          userId: ctx.user.id,
        }
      );
    },
  },

  Task: {
    comments: (parent: Task) => CommentService.getCommentsByTask(parent.id),
    stage: (parent: Task) => StageService.getStageById(parent.stage_id),
    assignees: (parent: Task) => TaskService.getTaskMembers(parent.id),
  },
};
