import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";
import {
  GET_WORKFLOWS,
  CREATE_TASK,
  DELETE_TASK,
  UPDATE_TASK,
  UPDATE_TASK_PRIORITY,
  MOVE_TASK,
  ADD_STAGE,
  DELETE_STAGE,
  REORDER_TASKS,
} from "../graphql";
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
  reorderStage: (stage_id: string, task_ids: string[]) => Promise<void>;
  deleteStage: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useProjectBoard(): UseProjectBoardResult {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? null;

  const {
    data,
    loading,
    error,
    refetch,
  } = useQuery<{ workflows: Workflow[] }>(GET_WORKFLOWS, {
    variables: { project_id: projectId },
    skip: !projectId,
  });

  const workflow = useMemo(() => data?.workflows?.[0] ?? null, [data]);
  const stages = useMemo(() => workflow?.stages ?? [], [workflow]);

  const refetchBoard = async () => {
    if (projectId) {
      await refetch({ project_id: projectId });
    }
  };

  const [createTaskMutation] = useMutation(CREATE_TASK);
  const [deleteTaskMutation] = useMutation(DELETE_TASK);
  const [moveTaskMutation] = useMutation(MOVE_TASK);
  const [updateTaskMutation] = useMutation(UPDATE_TASK);
  const [updatePriorityMutation] = useMutation(UPDATE_TASK_PRIORITY);
  const [addStageMutation] = useMutation(ADD_STAGE);
  const [deleteStageMutation] = useMutation(DELETE_STAGE);
  const [reorderTasksMutation] = useMutation(REORDER_TASKS);

  const createTask = async (stage_id: string, title: string) => {
    if (!projectId) return;
    await createTaskMutation({
      variables: { stage_id, title },
      refetchQueries: [{ query: GET_WORKFLOWS, variables: { project_id: projectId } }],
    });
  };

  const deleteTask = async (task_id: string) => {
    await deleteTaskMutation({
      variables: { id: task_id },
      refetchQueries: projectId
        ? [{ query: GET_WORKFLOWS, variables: { project_id: projectId } }]
        : [],
    });
  };

  const moveTask = async (task_id: string, to_stage_id: string) => {
    await moveTaskMutation({
      variables: { task_id, to_stage_id },
      refetchQueries: projectId
        ? [{ query: GET_WORKFLOWS, variables: { project_id: projectId } }]
        : [],
    });
  };

  const updateTask = async (input: Partial<Task> & { id: string }) => {
    await updateTaskMutation({
      variables: { ...input },
      refetchQueries: projectId
        ? [{ query: GET_WORKFLOWS, variables: { project_id: projectId } }]
        : [],
    });
  };

  const updatePriority = async (id: string, priority: Task["priority"]) => {
    if (!priority) return;
    await updatePriorityMutation({
      variables: { id, priority },
      refetchQueries: projectId
        ? [{ query: GET_WORKFLOWS, variables: { project_id: projectId } }]
        : [],
    });
  };

  const addStage = async (name: string) => {
    if (!workflow) return;
    await addStageMutation({
      variables: { workflow_id: workflow.id, name },
      refetchQueries: [{ query: GET_WORKFLOWS, variables: { project_id: projectId } }],
    });
  };

  const reorderStage = async (stage_id: string, task_ids: string[]) => {
    if (task_ids.length === 0) return;
    await reorderTasksMutation({
      variables: { stage_id, task_ids },
      refetchQueries: projectId
        ? [{ query: GET_WORKFLOWS, variables: { project_id: projectId } }]
        : [],
    });
  };

  const deleteStage = async (stage_id: string) => {
    await deleteStageMutation({
      variables: { id: stage_id },
      refetchQueries: projectId
        ? [{ query: GET_WORKFLOWS, variables: { project_id: projectId } }]
        : [],
    });
  };

  const refetchWrapper = async () => {
    await refetchBoard();
  };

  return {
    projectId,
    workflow,
    stages,
    loading,
    error,
    createTask,
    deleteTask,
    moveTask,
    updateTask,
    updatePriority,
    addStage,
    reorderStage,
    deleteStage,
    refetch: refetchWrapper,
  };
}
