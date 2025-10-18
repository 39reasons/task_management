import * as BoardService from "../services/BoardService.js";
import * as StageService from "../services/StageService.js";
import * as TaskService from "../services/TaskService.js";
import * as ProjectService from "../services/ProjectService.js";
import * as AIService from "../services/AIService.js";
import { createTaskBoardEventStream, ALL_PROJECTS_CHANNEL, type TaskBoardEvent } from "../events/taskBoardPubSub.js";
import type { GraphQLContext } from "../types/context";
import type { Stage, Board, BoardWorkflowType } from "../../../shared/types.js";
import type { Task } from "../../../shared/types.js";

export const boardResolvers = {
  Query: {
    boards: async (
      _: unknown,
      { project_id }: { project_id: string },
      ctx: GraphQLContext
    ): Promise<Board[]> => {
      return await BoardService.getBoardsByProject(project_id, ctx.user?.id ?? null);
    },
    board: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ): Promise<Board | null> => {
      return await BoardService.getBoardById(id, ctx.user?.id ?? null);
    },
    stages: async (
      _: unknown,
      { board_id }: { board_id: string },
      ctx: GraphQLContext
    ): Promise<Stage[]> => {
      return await StageService.getStagesByBoard(board_id);
    },
    boardWorkflowTypes: async (): Promise<BoardWorkflowType[]> => {
      return BoardService.listBoardWorkflowTypes();
    },
  },

  Mutation: {
    addStage: async (
      _: unknown,
      { board_id, name, position }: { board_id: string; name: string; position?: number },
      ctx: GraphQLContext
    ): Promise<Stage> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await StageService.addStage(board_id, name, position, {
        origin: ctx.clientId ?? null,
      });
    },
    updateStage: async (
      _: unknown,
      { id, name, position }: { id: string; name?: string; position?: number },
      ctx: GraphQLContext
    ): Promise<Stage> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await StageService.updateStage(id, name, position, {
        origin: ctx.clientId ?? null,
      });
    },
    deleteStage: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await StageService.deleteStage(id, {
        origin: ctx.clientId ?? null,
      });
    },
    reorderStages: async (
      _: unknown,
      { board_id, stage_ids }: { board_id: string; stage_ids: string[] },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) throw new Error("Not authenticated");
      await StageService.reorderStages(board_id, stage_ids, {
        origin: ctx.clientId ?? null,
      });
      return true;
    },
    generateBoardStages: async (
      _: unknown,
      { input }: { input: { board_id: string; prompt: string } },
      ctx: GraphQLContext
    ): Promise<Stage[]> => {
      if (!ctx.user) throw new Error("Not authenticated");

      const { board_id, prompt } = input;
      if (!prompt?.trim()) {
        throw new Error("Prompt is required");
      }

      const existingStages = await StageService.getStagesByBoard(board_id);
      const suggestions = await AIService.generateBoardStages(
        {
          prompt,
          existing_stage_names: existingStages.map((stage) => stage.name),
        },
        { userId: ctx.user.id }
      );

      if (suggestions.length === 0) {
        throw new Error("The assistant did not return any stage suggestions.");
      }

      const basePosition = existingStages.length
        ? Math.max(...existingStages.map((stage) => stage.position ?? 0)) + 1
        : 0;

      const createdStages: Stage[] = [];
      let position = basePosition;
      for (const suggestion of suggestions) {
        const stage = await StageService.addStage(board_id, suggestion.name, position, {
          origin: ctx.clientId ?? null,
        });
        createdStages.push(stage);
        position += 1;
      }

      return createdStages;
    },
    updateBoard: async (
      _: unknown,
      {
        id,
        name,
        workflow_type,
      }: { id: string; name?: string | null; workflow_type?: BoardWorkflowType | null },
      ctx: GraphQLContext
    ): Promise<Board> => {
      return await BoardService.updateBoard(
        id,
        {
          name: name ?? null,
          workflow_type: workflow_type ?? null,
        },
        ctx.user?.id ?? null
      );
    },
  },

  Board: {
    stages: async (parent: Board): Promise<Stage[]> => {
      return await StageService.getStagesByBoard(parent.id);
    },
  },

  Stage: {
    tasks: async (parent: Stage, _: unknown, ctx: GraphQLContext): Promise<Task[]> => {
      return await TaskService.getTasks({ stage_id: parent.id }, ctx.user?.id ?? null);
    },
  },

  Subscription: {
    taskBoardEvents: {
      subscribe: async (
        _: unknown,
        { project_id }: { project_id: string },
        ctx: GraphQLContext
      ) => {
        if (!ctx.user) throw new Error("Not authenticated");

        if (project_id !== ALL_PROJECTS_CHANNEL) {
          const hasAccess = await ProjectService.userHasProjectAccess(project_id, ctx.user.id);
          if (!hasAccess) {
            throw new Error("Project not found or not accessible");
          }
        }

        const iterator = createTaskBoardEventStream(project_id);
        const clientOrigin = ctx.clientId ?? null;

        const filtered = (async function* (): AsyncIterableIterator<TaskBoardEvent> {
          for await (const event of iterator) {
            if (clientOrigin && event.origin && event.origin === clientOrigin) {
              continue;
            }
            yield event;
          }
        })();

        return filtered;
      },
      resolve: (event: TaskBoardEvent) => ({
        ...event,
        team_id: event.team_id ?? null,
        board_id: event.board_id ?? null,
        stage_id: event.stage_id ?? null,
        previous_stage_id: event.previous_stage_id ?? null,
        task_id: event.task_id ?? null,
        task_ids: event.task_ids ?? null,
        stage_ids: event.stage_ids ?? null,
        origin: event.origin ?? null,
        timestamp: event.timestamp ?? null,
      }),
    },
  },
};
