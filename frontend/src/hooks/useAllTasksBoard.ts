import { useMemo } from "react";
import { useMutation, useQuery, useSubscription } from "@apollo/client";
import {
  GET_TASKS,
  DELETE_TASK,
  UPDATE_TASK,
  UPDATE_TASK_PRIORITY,
  MOVE_TASK,
  REORDER_TASKS,
  TASK_BOARD_EVENTS,
} from "../graphql";
import type { Stage, Task } from "@shared/types";
import { TASK_BOARD_ALL_PROJECTS } from "@shared/types";
import { useTeamContext } from "../providers/TeamProvider";

interface UseAllTasksBoardResult {
  stages: Array<Stage & { tasks: Task[] }>;
  loading: boolean;
  error: unknown;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (task_id: string, stage_id: string) => Promise<void>;
  updateTask: (input: Partial<Task> & { id: string }) => Promise<void>;
  updatePriority: (id: string, priority: Task["priority"]) => Promise<void>;
  reorderStage: (stage_id: string, task_ids: string[]) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useAllTasksBoard(): UseAllTasksBoardResult {
  const { activeTeamId } = useTeamContext();
  const { data, loading, error, refetch } = useQuery<{ tasks: Task[] }>(GET_TASKS, {
    variables: activeTeamId ? { team_id: activeTeamId } : undefined,
    skip: !activeTeamId,
    fetchPolicy: "network-only",
    nextFetchPolicy: "cache-first",
    errorPolicy: "all",
  });

  useSubscription(TASK_BOARD_EVENTS, {
    variables: { project_id: TASK_BOARD_ALL_PROJECTS },
    onData: ({ data: subscriptionData }) => {
      const eventTeamId = subscriptionData.data?.taskBoardEvents?.team_id ?? null;
      if (!activeTeamId || !eventTeamId || eventTeamId === activeTeamId) {
        void refetch();
      }
    },
    skip: !activeTeamId,
  });

  const stageBuckets = useMemo(() => {
    const map = new Map<string, Stage & { tasks: Task[] }>();

    if (!activeTeamId) {
      return [] as Array<Stage & { tasks: Task[] }>;
    }

    for (const task of data?.tasks ?? []) {
      if (task.team_id && task.team_id !== activeTeamId) {
        continue;
      }
      const stageInfo = task.stage
        ? {
            id: task.stage.id,
            name: task.stage.name,
            position: task.stage.position,
            workflow_id: task.stage.workflow_id,
          }
        : {
            id: "unassigned",
            name: "Unassigned",
            position: Number.MAX_SAFE_INTEGER,
            workflow_id: "unknown",
          };

      if (!map.has(stageInfo.id)) {
        map.set(stageInfo.id, { ...stageInfo, tasks: [] });
      }

      map.get(stageInfo.id)!.tasks.push(task);
    }

    return Array.from(map.values())
      .map((stage) => ({
        ...stage,
        tasks: [...stage.tasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
      }))
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  }, [activeTeamId, data]);

  const [deleteTaskMutation] = useMutation(DELETE_TASK);
  const [moveTaskMutation] = useMutation(MOVE_TASK);
  const [updateTaskMutation] = useMutation(UPDATE_TASK);
  const [updatePriorityMutation] = useMutation(UPDATE_TASK_PRIORITY);
  const [reorderTasksMutation] = useMutation(REORDER_TASKS);

  const deleteTask = async (id: string) => {
    await deleteTaskMutation({
      variables: { id },
      refetchQueries: activeTeamId
        ? [{ query: GET_TASKS, variables: { team_id: activeTeamId } }]
        : [],
    });
  };

  const moveTask = async (task_id: string, to_stage_id: string) => {
    await moveTaskMutation({
      variables: { task_id, to_stage_id },
      refetchQueries: activeTeamId
        ? [{ query: GET_TASKS, variables: { team_id: activeTeamId } }]
        : [],
    });
  };

  const updateTask = async (input: Partial<Task> & { id: string }) => {
    await updateTaskMutation({
      variables: { ...input },
      refetchQueries: activeTeamId
        ? [{ query: GET_TASKS, variables: { team_id: activeTeamId } }]
        : [],
    });
  };

  const updatePriority = async (id: string, priority: Task["priority"]) => {
    if (!priority) return;
    await updatePriorityMutation({
      variables: { id, priority },
      refetchQueries: activeTeamId
        ? [{ query: GET_TASKS, variables: { team_id: activeTeamId } }]
        : [],
    });
  };

  const reorderStage = async (stage_id: string, task_ids: string[]) => {
    if (task_ids.length === 0) return;
    await reorderTasksMutation({
      variables: { stage_id, task_ids },
      refetchQueries: activeTeamId
        ? [{ query: GET_TASKS, variables: { team_id: activeTeamId } }]
        : [],
    });
  };

  return {
    stages: stageBuckets,
    loading: loading && Boolean(activeTeamId),
    error,
    deleteTask,
    moveTask,
    updateTask,
    updatePriority,
    reorderStage,
    refetch: async () => {
      await refetch();
    },
  };
}
