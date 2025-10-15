import { useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useSubscription } from "@apollo/client";

import { GET_WORKFLOWS, TASK_BOARD_EVENTS } from "../graphql";
import { normalizeWorkflow, selectStages } from "./boardCache";
import { useTaskMutations } from "./useTaskMutations";
import { useStageMutations } from "./useStageMutations";

import type { Stage, Task, Workflow } from "@shared/types";

interface UseProjectBoardResult {
  projectId: string | null;
  workflow: Workflow | null;
  stages: Stage[];
  loading: boolean;
  error: unknown;
  createTask: (stage_id: string, title: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (task_id: string, to_stage_id: string) => Promise<void>;
  updateTask: (input: Partial<Task> & { id: string }) => Promise<void>;
  updatePriority: (id: string, priority: Task["priority"]) => Promise<void>;
  addStage: (name: string) => Promise<void>;
  generateWorkflowStages: (prompt: string) => Promise<void>;
  reorderStage: (stage_id: string, task_ids: string[]) => Promise<void>;
  reorderStagesOrder: (stage_ids: string[]) => Promise<void>;
  deleteStage: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useProjectBoard(): UseProjectBoardResult {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? null;

  const { data, loading, error, refetch } = useQuery<{ workflows: Workflow[] }>(
    GET_WORKFLOWS,
    {
      variables: { project_id: projectId },
      skip: !projectId,
      fetchPolicy: "network-only",
      nextFetchPolicy: "cache-first",
    }
  );

  const workflow = useMemo(() => {
    const fetchedWorkflow = data?.workflows?.[0];
    return fetchedWorkflow ? normalizeWorkflow(fetchedWorkflow) : null;
  }, [data]);

  const stages = useMemo(() => selectStages(workflow), [workflow]);

  const refetchBoard = useCallback(async () => {
    if (!projectId) {
      return;
    }

    await refetch({ project_id: projectId });
  }, [projectId, refetch]);

  useSubscription(TASK_BOARD_EVENTS, {
    variables: { project_id: projectId ?? "" },
    skip: !projectId,
    onData: () => {
      void refetchBoard();
    },
  });

  const taskMutations = useTaskMutations({ projectId, stages, workflow });
  const stageMutations = useStageMutations({ projectId, workflow });

  const refetchWrapper = useCallback(async () => {
    await refetchBoard();
  }, [refetchBoard]);

  return {
    projectId,
    workflow,
    stages,
    loading,
    error,
    ...taskMutations,
    ...stageMutations,
    refetch: refetchWrapper,
  };
}
