import { useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useSubscription } from "@apollo/client";
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
  REORDER_STAGES,
  GENERATE_WORKFLOW_STAGES,
  TASK_BOARD_EVENTS,
} from "../graphql";
import type { Stage, Task, Workflow } from "@shared/types";

function normalizeTaskForCache(task: Task) {
  return {
    ...task,
    __typename: "Task" as const,
    tags: (task.tags ?? []).map((tag) => ({
      ...tag,
      __typename: "Tag" as const,
    })) as unknown as Task["tags"],
    assignees: (task.assignees ?? []).map((user) => ({
      ...user,
      __typename: "User" as const,
    })) as unknown as Task["assignees"],
  };
}

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

  const {
    data,
    loading,
    error,
    refetch,
  } = useQuery<{ workflows: Workflow[] }>(GET_WORKFLOWS, {
    variables: { project_id: projectId },
    skip: !projectId,
    fetchPolicy: "network-only",
    nextFetchPolicy: "cache-first",
  });

  const workflow = useMemo(() => data?.workflows?.[0] ?? null, [data]);
  const stages = useMemo(() => workflow?.stages ?? [], [workflow]);

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

  const [createTaskMutation] = useMutation(CREATE_TASK);
  const [deleteTaskMutation] = useMutation(DELETE_TASK);
  const [moveTaskMutation] = useMutation(MOVE_TASK);
  const [updateTaskMutation] = useMutation(UPDATE_TASK);
  const [updatePriorityMutation] = useMutation(UPDATE_TASK_PRIORITY);
  const [addStageMutation] = useMutation(ADD_STAGE);
  const [deleteStageMutation] = useMutation(DELETE_STAGE);
  const [reorderTasksMutation] = useMutation(REORDER_TASKS);
  const [reorderStagesMutation] = useMutation(REORDER_STAGES);
  const [generateWorkflowStagesMutation] = useMutation(GENERATE_WORKFLOW_STAGES);


  const createTask = async (stage_id: string, title: string) => {
    if (!projectId) return;

    const stageMeta = stages.find((stage) => stage.id === stage_id);
    const optimisticId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `temp-${Date.now()}`;

    const optimisticTask = normalizeTaskForCache({
      id: optimisticId,
      title,
      description: null,
      due_date: null,
      priority: null,
      stage_id,
      project_id: projectId,
      position: stageMeta?.tasks.length ?? 0,
      assignees: [],
      tags: [],
    } as unknown as Task);

    await createTaskMutation({
      variables: { stage_id, title },
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

        cache.updateQuery<{ workflows: Workflow[] }>(
          { query: GET_WORKFLOWS, variables: { project_id: projectId } },
          (existing) => {
            if (!existing) {
              return existing;
            }

            const workflows = existing.workflows.map((workflow) => {
              if (workflow.project_id !== projectId) {
                return workflow;
              }

              const nextStages = workflow.stages.map((stage) => {
                if (stage.id !== created.stage_id) {
                  return stage;
                }

                const withoutDuplicate = stage.tasks.filter(
                  (task) => task.id !== created.id && task.id !== optimisticId
                );
                const nextTasks = [...withoutDuplicate, created]
                  .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                  .map((task, index) => ({
                    ...task,
                    position: index,
                  }));

                return {
                  ...stage,
                  tasks: nextTasks,
                };
              });

              return {
                ...workflow,
                stages: nextStages,
              };
            });

            return {
              ...existing,
              workflows,
            };
          }
        );
      },
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

  const generateWorkflowStages = async (prompt: string) => {
    if (!workflow) return;
    await generateWorkflowStagesMutation({
      variables: {
        input: {
          workflow_id: workflow.id,
          prompt,
        },
      },
      refetchQueries: [{ query: GET_WORKFLOWS, variables: { project_id: projectId } }],
    });
  };

  const reorderStage = async (stage_id: string, task_ids: string[]) => {
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

  const reorderStagesOrder = async (stage_ids: string[]) => {
    if (!workflow) return;
    await reorderStagesMutation({
      variables: { workflow_id: workflow.id, stage_ids },
      refetchQueries: projectId
        ? [{ query: GET_WORKFLOWS, variables: { project_id: projectId } }]
        : [],
    });
  };

  const refetchWrapper = useCallback(async () => {
    await refetchBoard();
  }, [refetchBoard]);

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
    generateWorkflowStages,
    reorderStage,
    reorderStagesOrder,
    deleteStage,
    refetch: refetchWrapper,
  };
}
