import { useCallback } from "react";
import { useMutation } from "@apollo/client";

import {
  ADD_STAGE,
  DELETE_STAGE,
  GENERATE_BOARD_STAGES,
  GET_BOARDS,
  REORDER_STAGES,
} from "../graphql";

import type { Board } from "@shared/types";

const boardRefetchQuery = (projectId: string | null) =>
  projectId
    ? [{ query: GET_BOARDS, variables: { project_id: projectId } }]
    : [];

interface UseStageMutationsOptions {
  projectId: string | null;
  board: Board | null;
}

interface UseStageMutationsResult {
  addStage: (name: string) => Promise<void>;
  deleteStage: (id: string) => Promise<void>;
  generateBoardStages: (prompt: string) => Promise<void>;
  reorderStagesOrder: (stage_ids: string[]) => Promise<void>;
}

export function useStageMutations({
  projectId,
  board,
}: UseStageMutationsOptions): UseStageMutationsResult {
  const [addStageMutation] = useMutation(ADD_STAGE);
  const [deleteStageMutation] = useMutation(DELETE_STAGE);
  const [reorderStagesMutation] = useMutation(REORDER_STAGES);
  const [generateBoardStagesMutation] = useMutation(GENERATE_BOARD_STAGES);

  const addStage = useCallback(
    async (name: string) => {
      if (!board) return;

      await addStageMutation({
        variables: { board_id: board.id, name },
        refetchQueries: boardRefetchQuery(projectId),
      });
    },
    [addStageMutation, board, projectId]
  );

  const deleteStage = useCallback(
    async (stage_id: string) => {
      await deleteStageMutation({
        variables: { id: stage_id },
        refetchQueries: boardRefetchQuery(projectId),
      });
    },
    [deleteStageMutation, projectId]
  );

  const generateBoardStages = useCallback(
    async (prompt: string) => {
      if (!board) return;

      await generateBoardStagesMutation({
        variables: {
          input: {
            board_id: board.id,
            prompt,
          },
        },
        refetchQueries: boardRefetchQuery(projectId),
      });
    },
    [board, generateBoardStagesMutation, projectId]
  );

  const reorderStagesOrder = useCallback(
    async (stage_ids: string[]) => {
      if (!board) return;

      await reorderStagesMutation({
        variables: { board_id: board.id, stage_ids },
        refetchQueries: boardRefetchQuery(projectId),
      });
    },
    [board, projectId, reorderStagesMutation]
  );

  return {
    addStage,
    deleteStage,
    generateBoardStages,
    reorderStagesOrder,
  };
}
