import { useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useSubscription } from "@apollo/client";

import { GET_WORKFLOWS, TASK_BOARD_EVENTS } from "../graphql";

import type { Stage, Task, Workflow } from "@shared/types";

type TaskFallback = Partial<Task> & {
  stage?: Task["stage"] | null;
  sprint?: Task["sprint"] | null;
};

function normalizeTaskForCache(task: Task, fallback: TaskFallback = {}) {
  const merged = { ...fallback, ...task } as Task;
  const projectId = merged.project_id ?? fallback.project_id ?? null;
  const teamId = merged.team_id ?? fallback.team_id ?? null;

  const stageValue = (merged.stage ?? fallback.stage ?? null)
    ? ({
        ...(merged.stage ?? fallback.stage ?? null)!,
        __typename: "Stage" as const,
      } as Task["stage"])
    : null;

  const sprintValue = (merged.sprint ?? fallback.sprint ?? null)
    ? ({
        ...(merged.sprint ?? fallback.sprint ?? null)!,
        __typename: "Sprint" as const,
      } as Task["sprint"])
    : null;

  return {
    ...merged,
    status: merged.status ?? "new",
    estimate: merged.estimate ?? null,
    backlog_id: merged.backlog_id ?? null,
    sprint_id: merged.sprint_id ?? null,
    project_id: projectId,
    team_id: teamId,
    position: merged.position ?? fallback.position ?? 0,
    created_at: merged.created_at ?? fallback.created_at ?? null,
    updated_at: merged.updated_at ?? fallback.updated_at ?? null,
    stage: stageValue,
    sprint: sprintValue,
    __typename: "Task" as const,
    tags: (merged.tags ?? fallback.tags ?? []).map((tag) => ({
      ...tag,
      __typename: "Tag" as const,
    })) as unknown as Task["tags"],
    assignee_id: merged.assignee_id ?? fallback.assignee_id ?? null,
    assignee: merged.assignee ?? fallback.assignee
      ? ({
          ...(merged.assignee ?? fallback.assignee)!,
          __typename: "User" as const,
        } as unknown as Task["assignee"])
      : null,
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

    const nowIso = new Date().toISOString();
    const stageFallback = stageMeta ? stageMeta : null;

    const fallbackProps: TaskFallback = {
      project_id: projectId,
      team_id: workflow?.team_id ?? null,
      stage_id,
      stage: stageFallback,
      sprint_id: null,
      sprint: null,
      created_at: nowIso,
      updated_at: nowIso,
      position: stageMeta?.tasks.length ?? 0,
    };

    const optimisticTask = normalizeTaskForCache({
      id: optimisticId,
      title,
      description: null,
      due_date: null,
      priority: null,
      status: "new",
      stage_id,
      backlog_id: null,
      sprint_id: null,
      estimate: null,
      assignee_id: null,
      assignee: null,
      tags: [],
    } as unknown as Task, fallbackProps);

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
          ? normalizeTaskForCache(data.createTask as Task, fallbackProps)
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
                  })) as Task[];

                return {
                  ...stage,
                  tasks: nextTasks,
                } as Stage;
              }) as Stage[];

              return {
                ...workflow,
                stages: nextStages,
              } as Workflow;
            }) as Workflow[];

            return {
              ...existing,
              workflows,
            } as { workflows: Workflow[] };
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
    ...taskMutations,
    ...stageMutations,
    refetch: refetchWrapper,
  };
}

