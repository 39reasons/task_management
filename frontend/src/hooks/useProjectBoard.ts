import { useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useSubscription } from "@apollo/client";

import { GET_BOARDS, TASK_BOARD_EVENTS } from "../graphql";
import { normalizeBoard, selectStages } from "./boardCache";
import { useTaskMutations } from "./useTaskMutations";
import { useStageMutations } from "./useStageMutations";

import type { Stage, Task, Board } from "@shared/types";

interface UseProjectBoardResult {
  projectId: string | null;
  board: Board | null;
  stages: Stage[];
  loading: boolean;
  error: unknown;
  createTask: (stage_id: string, title: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (task_id: string, to_stage_id: string) => Promise<void>;
  updateTask: (input: Partial<Task> & { id: string }) => Promise<void>;
  updatePriority: (id: string, priority: Task["priority"]) => Promise<void>;
  addStage: (name: string) => Promise<void>;
  generateBoardStages: (prompt: string) => Promise<void>;
  reorderStage: (stage_id: string, task_ids: string[]) => Promise<void>;
  reorderStagesOrder: (stage_ids: string[]) => Promise<void>;
  deleteStage: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useProjectBoard(): UseProjectBoardResult {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? null;

  const { data, loading, error, refetch } = useQuery<{ boards: Board[] }>(
    GET_BOARDS,
    {
      variables: { project_id: projectId },
      skip: !projectId,
      fetchPolicy: "network-only",
      nextFetchPolicy: "cache-first",
    }
  );

  const board = useMemo(() => {
    const fetchedBoard = data?.boards?.[0];
    return fetchedBoard ? normalizeBoard(fetchedBoard) : null;
  }, [data]);

  const stages = useMemo(() => selectStages(board), [board]);

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

  const taskMutations = useTaskMutations({ projectId, stages, board });
  const stageMutations = useStageMutations({ projectId, board });

  const refetchWrapper = useCallback(async () => {
    await refetchBoard();
  }, [refetchBoard]);

  return {
    projectId,
    board,
    stages,
    loading,
    error,
    ...taskMutations,
    ...stageMutations,
    refetch: refetchWrapper,
  };
}
