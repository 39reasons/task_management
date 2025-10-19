import * as TaskService from "../services/TaskService.js";
import * as CommentService from "../services/CommentService.js";
import * as StageService from "../services/StageService.js";
import * as SprintService from "../services/SprintService.js";
import * as AIService from "../services/AIService.js";
import * as WorkItemService from "../services/WorkItemService.js";
import type { Task, TaskDraftSuggestion } from "../../../shared/types.js";
import type { GraphQLContext } from "../types/context";

export const taskResolvers = {
  Query: {
    tasks: async (
      _: unknown,
      args: {
        team_id?: string;
        project_id?: string;
        stage_id?: string;
        backlog_id?: string;
        board_id?: string;
        sprint_id?: string;
      },
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
        project_id,
        team_id,
        stage_id,
        backlog_id,
        sprint_id,
        title,
        description,
        due_date,
        priority,
        estimate,
        status,
      }: {
        project_id: string;
        team_id: string;
        stage_id?: string | null;
        backlog_id?: string | null;
        sprint_id?: string | null;
        title: string;
        description?: string;
        due_date?: string;
        priority?: string;
        estimate?: number | null;
        status?: string;
      },
      ctx: GraphQLContext
    ): Promise<Task> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await TaskService.createTask(
        {
          project_id,
          team_id,
          stage_id,
          backlog_id,
          sprint_id,
          title,
          description,
          due_date,
          priority,
          estimate,
          status,
        },
        {
          origin: ctx.clientId ?? null,
          actorId: ctx.user.id,
        }
      );
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
        backlog_id,
        sprint_id,
        estimate,
        status,
      }: {
        id: string;
        title?: string;
        description?: string;
        due_date?: string | null;
        priority?: string | null;
        stage_id?: string | null;
        backlog_id?: string | null;
        sprint_id?: string | null;
        estimate?: number | null;
        status?: string | null;
      },
      ctx: GraphQLContext
    ): Promise<Task> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await TaskService.updateTask(
        id,
        {
          title,
          description,
          due_date,
          priority,
          estimate,
          stage_id,
          backlog_id,
          sprint_id,
          status,
        },
        {
          origin: ctx.clientId ?? null,
          actorId: ctx.user.id,
        }
      );
    },

    deleteTask: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await TaskService.deleteTask(id, {
        origin: ctx.clientId ?? null,
        actorId: ctx.user.id,
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
        actorId: ctx.user.id,
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
        actorId: ctx.user.id,
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
        actorId: ctx.user.id,
      });
      return true;
    },

    reorderBacklogTasks: async (
      _: unknown,
      {
        project_id,
        team_id,
        backlog_id,
        task_ids,
      }: { project_id: string; team_id: string; backlog_id?: string | null; task_ids: string[] },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) throw new Error("Not authenticated");
      await TaskService.reorderBacklogTasks(
        project_id,
        team_id,
        backlog_id ?? null,
        task_ids,
        {
          origin: ctx.clientId ?? null,
          actorId: ctx.user.id,
        }
      );
      return true;
    },

    setTaskAssignee: async (
      _: unknown,
      { task_id, member_id }: { task_id: string; member_id?: string | null },
      ctx: GraphQLContext
    ): Promise<Task> => {
      if (!ctx.user) throw new Error("Not authenticated");
      await TaskService.setTaskAssignee(task_id, member_id ?? null, {
        origin: ctx.clientId ?? null,
        actorId: ctx.user.id,
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
    stage: (parent: Task) => (parent.stage_id ? StageService.getStageById(parent.stage_id) : null),
    sprint: (parent: Task) => (parent.sprint_id ? SprintService.getSprintById(parent.sprint_id) : null),
    assignee: (parent: Task) => TaskService.getTaskAssignee(parent),
    history: (parent: Task, args: { limit?: number }) =>
      TaskService.getTaskHistory(parent.id, args?.limit ?? 50),
    parent_id: (parent: Task) => parent.parent_id ?? null,
    parent: async (parent: Task) => {
      if (parent.parent_id) {
        return await WorkItemService.getWorkItemById(parent.parent_id);
      }
      return await WorkItemService.getWorkItemParent(parent.id);
    },
    children: (parent: Task) => WorkItemService.getWorkItemChildren(parent.id),
    bug_details: () => null,
    issue_details: () => null,
  },
};
