import { useCallback } from "react";
import { useMutation } from "@apollo/client";

import {
  ADD_STAGE,
  DELETE_STAGE,
  GENERATE_WORKFLOW_STAGES,
  GET_WORKFLOWS,
  REORDER_STAGES,
} from "../graphql";

import type { Workflow } from "@shared/types";

const workflowRefetchQuery = (projectId: string | null) =>
  projectId
    ? [{ query: GET_WORKFLOWS, variables: { project_id: projectId } }]
    : [];

interface UseStageMutationsOptions {
  projectId: string | null;
  workflow: Workflow | null;
}

interface UseStageMutationsResult {
  addStage: (name: string) => Promise<void>;
  deleteStage: (id: string) => Promise<void>;
  generateWorkflowStages: (prompt: string) => Promise<void>;
  reorderStagesOrder: (stage_ids: string[]) => Promise<void>;
}

export function useStageMutations({
  projectId,
  workflow,
}: UseStageMutationsOptions): UseStageMutationsResult {
  const [addStageMutation] = useMutation(ADD_STAGE);
  const [deleteStageMutation] = useMutation(DELETE_STAGE);
  const [reorderStagesMutation] = useMutation(REORDER_STAGES);
  const [generateWorkflowStagesMutation] = useMutation(GENERATE_WORKFLOW_STAGES);

  const addStage = useCallback(
    async (name: string) => {
      if (!workflow) return;

      await addStageMutation({
        variables: { workflow_id: workflow.id, name },
        refetchQueries: workflowRefetchQuery(projectId),
      });
    },
    [addStageMutation, projectId, workflow]
  );

  const deleteStage = useCallback(
    async (stage_id: string) => {
      await deleteStageMutation({
        variables: { id: stage_id },
        refetchQueries: workflowRefetchQuery(projectId),
      });
    },
    [deleteStageMutation, projectId]
  );

  const generateWorkflowStages = useCallback(
    async (prompt: string) => {
      if (!workflow) return;

      await generateWorkflowStagesMutation({
        variables: {
          input: {
            workflow_id: workflow.id,
            prompt,
          },
        },
        refetchQueries: workflowRefetchQuery(projectId),
      });
    },
    [generateWorkflowStagesMutation, projectId, workflow]
  );

  const reorderStagesOrder = useCallback(
    async (stage_ids: string[]) => {
      if (!workflow) return;

      await reorderStagesMutation({
        variables: { workflow_id: workflow.id, stage_ids },
        refetchQueries: workflowRefetchQuery(projectId),
      });
    },
    [projectId, reorderStagesMutation, workflow]
  );

  return {
    addStage,
    deleteStage,
    generateWorkflowStages,
    reorderStagesOrder,
  };
}

