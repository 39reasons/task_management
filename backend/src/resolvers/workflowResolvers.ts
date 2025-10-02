import * as WorkflowService from "../services/WorkflowService.js";
import * as StageService from "../services/StageService.js";
import * as TaskService from "../services/TaskService.js";
import type { GraphQLContext } from "../types/context";
import type { Stage, Workflow } from "@shared/types";
import type { Task } from "@shared/types";

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
      return await StageService.addStage(workflow_id, name, position);
    },
    updateStage: async (
      _: unknown,
      { id, name, position }: { id: string; name?: string; position?: number },
      ctx: GraphQLContext
    ): Promise<Stage> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await StageService.updateStage(id, name, position);
    },
    deleteStage: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ): Promise<boolean> => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await StageService.deleteStage(id);
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
};
