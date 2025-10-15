import { useCallback } from "react";
import { useMutation } from "@apollo/client";

import {
  CREATE_TASK,
  DELETE_TASK,
  MOVE_TASK,
  REORDER_TASKS,
  UPDATE_TASK,
  UPDATE_TASK_PRIORITY,
  GET_WORKFLOWS,
} from "../graphql";

import type { Stage, Task, Workflow } from "@shared/types";

import {
  createOptimisticTask,
  normalizeTaskForCache,
  writeTaskToCache,
} from "./boardCache";

interface UseTaskMutationsOptions {
  projectId: string | null;
  stages: Stage[];
  workflow: Workflow | null;
}

interface UseTaskMutationsResult {
  createTask: (stage_id: string, title: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (task_id: string, to_stage_id: string) => Promise<void>;
  reorderStage: (stage_id: string, task_ids: string[]) => Promise<void>;
  updateTask: (input: Partial<Task> & { id: string }) => Promise<void>;
  updatePriority: (id: string, priority: Task["priority"]) => Promise<void>;
}

const workflowRefetchQuery = (projectId: string | null) =>
  projectId
    ? [{ query: GET_WORKFLOWS, variables: { project_id: projectId } }]
    : [];

export function useTaskMutations({
  projectId,
  stages,
  workflow,
}: UseTaskMutationsOptions): UseTaskMutationsResult {
  const [createTaskMutation] = useMutation(CREATE_TASK);
  const [deleteTaskMutation] = useMutation(DELETE_TASK);
  const [moveTaskMutation] = useMutation(MOVE_TASK);
  const [updateTaskMutation] = useMutation(UPDATE_TASK);
  const [updatePriorityMutation] = useMutation(UPDATE_TASK_PRIORITY);
  const [reorderTasksMutation] = useMutation(REORDER_TASKS);

  const createTask = useCallback(
    async (stage_id: string, title: string) => {
      if (!projectId) return;

      const stageMeta = stages.find((stage) => stage.id === stage_id);
      const { task: optimisticTask, optimisticId } = createOptimisticTask({
        stage: stageMeta,
        stageId: stage_id,
        projectId,
        teamId: workflow?.team_id ?? null,
        title,
      });

      await createTaskMutation({
        variables: { project_id: projectId, stage_id, title, status: "new" },
        optimisticResponse: {
          createTask: {
            ...optimisticTask,
            stage: stageMeta
              ? {
                  __typename: "Stage" as const,
                  id: stageMeta.id,
                  name: stageMeta.name,
                  position: stageMeta.position,
                  workflow_id: stageMeta.workflow_id,
                }
              : null,
          },
        },
        update: (cache, { data }) => {
          const created = data?.createTask
            ? normalizeTaskForCache(data.createTask as Task)
            : optimisticTask;

          writeTaskToCache({
            cache,
            projectId,
            task: created,
            optimisticId,
          });
        },
      });
    },
    [createTaskMutation, projectId, stages]
  );

  const deleteTask = useCallback(
    async (task_id: string) => {
      await deleteTaskMutation({
        variables: { id: task_id },
        refetchQueries: workflowRefetchQuery(projectId),
      });
    },
    [deleteTaskMutation, projectId]
  );

  const moveTask = useCallback(
    async (task_id: string, to_stage_id: string) => {
      await moveTaskMutation({
        variables: { task_id, to_stage_id },
        refetchQueries: workflowRefetchQuery(projectId),
      });
    },
    [moveTaskMutation, projectId]
  );

  const updateTask = useCallback(
    async (input: Partial<Task> & { id: string }) => {
      await updateTaskMutation({
        variables: { ...input },
        refetchQueries: workflowRefetchQuery(projectId),
      });
    },
    [projectId, updateTaskMutation]
  );

  const updatePriority = useCallback(
    async (id: string, priority: Task["priority"]) => {
      if (!priority) return;
      await updatePriorityMutation({
        variables: { id, priority },
        refetchQueries: workflowRefetchQuery(projectId),
      });
    },
    [projectId, updatePriorityMutation]
  );

  const reorderStage = useCallback(
    async (stage_id: string, task_ids: string[]) => {
      await reorderTasksMutation({
        variables: { stage_id, task_ids },
        refetchQueries: workflowRefetchQuery(projectId),
      });
    },
    [projectId, reorderTasksMutation]
  );

  return {
    createTask,
    deleteTask,
    moveTask,
    reorderStage,
    updateTask,
    updatePriority,
  };
}
