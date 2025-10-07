import * as WorkflowService from "../services/WorkflowService.js";
import * as StageService from "../services/StageService.js";
import * as TaskService from "../services/TaskService.js";
import * as ProjectService from "../services/ProjectService.js";
import * as AIService from "../services/AIService.js";
import { createTaskBoardEventStream, ALL_PROJECTS_CHANNEL, type TaskBoardEvent } from "../events/taskBoardPubSub.js";
import type { GraphQLContext } from "../types/context";
import type { Stage, Workflow } from "../../../shared/types.js";
import type { Task } from "../../../shared/types.js";

export const workflowResolvers = {
  Query: {
    workflows: async (
      _: unknown,
      { project_id }: { project_id: string },
      ctx: GraphQLContext
    ): Promise<Workflow[]> => {
      return await WorkflowService.getWorkflowsByProject(project_id, ctx.user?.id ?? null);
    },
    workflow: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ): Promise<Workflow | null> => {
      return await WorkflowService.getWorkflowById(id, ctx.user?.id ?? null);
    },
    stages: async (
      _: unknown,
      { workflow_id }: { workflow_id: string },
      ctx: GraphQLContext
    ): Promise<Stage[]> => {
      return await StageService.getStagesByWorkflow(workflow_id);
    },
  },

  Mutation: {
    addStage: async (
      _: unknown,
      { workflow_id, name, position }: { workflow_id: string; name: string; position?: number },
      ctx: GraphQLContext
    ): Promise<Stage> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await StageService.addStage(workflow_id, name, position, {
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
      { workflow_id, stage_ids }: { workflow_id: string; stage_ids: string[] },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) throw new Error("Not authenticated");
      await StageService.reorderStages(workflow_id, stage_ids, {
        origin: ctx.clientId ?? null,
      });
      return true;
    },
    generateWorkflowStages: async (
      _: unknown,
      { input }: { input: { workflow_id: string; prompt: string } },
      ctx: GraphQLContext
    ): Promise<Stage[]> => {
      if (!ctx.user) throw new Error("Not authenticated");

      const { workflow_id, prompt } = input;
      if (!prompt?.trim()) {
        throw new Error("Prompt is required");
      }

      const existingStages = await StageService.getStagesByWorkflow(workflow_id);
      const suggestions = await AIService.generateWorkflowStages(
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
        const stage = await StageService.addStage(workflow_id, suggestion.name, position, {
          origin: ctx.clientId ?? null,
        });
        createdStages.push(stage);
        position += 1;
      }

      return createdStages;
    },
  },

  Workflow: {
    stages: async (parent: Workflow): Promise<Stage[]> => {
      return await StageService.getStagesByWorkflow(parent.id);
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
        workflow_id: event.workflow_id ?? null,
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
