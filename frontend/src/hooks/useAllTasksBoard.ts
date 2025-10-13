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

export function useAllTasksBoard(teamId: string | null): UseAllTasksBoardResult {
  const { data, loading, error, refetch } = useQuery<{ tasks: Task[] }>(GET_TASKS, {
    variables: teamId ? { team_id: teamId } : undefined,
    skip: !teamId,
    fetchPolicy: "network-only",
    nextFetchPolicy: "cache-first",
    errorPolicy: "all",
  });

  useSubscription(TASK_BOARD_EVENTS, {
    variables: { project_id: TASK_BOARD_ALL_PROJECTS },
    onData: ({ data: subscriptionData }) => {
      const eventTeamId = subscriptionData.data?.taskBoardEvents?.team_id ?? null;
      if (!teamId || !eventTeamId || eventTeamId === teamId) {
        void refetch();
      }
    },
    skip: !teamId,
  });

  const stageBuckets = useMemo(() => {
    const map = new Map<string, Stage & { tasks: Task[] }>();

    if (!teamId) {
      return [] as Array<Stage & { tasks: Task[] }>;
    }

    for (const task of data?.tasks ?? []) {
      if (task.team_id && task.team_id !== teamId) {
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
  }, [teamId, data]);

  const [deleteTaskMutation] = useMutation(DELETE_TASK);
  const [moveTaskMutation] = useMutation(MOVE_TASK);
  const [updateTaskMutation] = useMutation(UPDATE_TASK);
  const [updatePriorityMutation] = useMutation(UPDATE_TASK_PRIORITY);
  const [reorderTasksMutation] = useMutation(REORDER_TASKS);

  const deleteTask = async (id: string) => {
    await deleteTaskMutation({
      variables: { id },
      refetchQueries: teamId
        ? [{ query: GET_TASKS, variables: { team_id: teamId } }]
        : [],
    });
  };

  const moveTask = async (task_id: string, to_stage_id: string) => {
    await moveTaskMutation({
      variables: { task_id, to_stage_id },
      refetchQueries: teamId
        ? [{ query: GET_TASKS, variables: { team_id: teamId } }]
        : [],
    });
  };

  const updateTask = async (input: Partial<Task> & { id: string }) => {
    await updateTaskMutation({
      variables: { ...input },
      refetchQueries: teamId
        ? [{ query: GET_TASKS, variables: { team_id: teamId } }]
        : [],
    });
  };

  const updatePriority = async (id: string, priority: Task["priority"]) => {
    if (!priority) return;
    await updatePriorityMutation({
      variables: { id, priority },
      refetchQueries: teamId
        ? [{ query: GET_TASKS, variables: { team_id: teamId } }]
        : [],
    });
  };

  const reorderStage = async (stage_id: string, task_ids: string[]) => {
    if (task_ids.length === 0) return;
    await reorderTasksMutation({
      variables: { stage_id, task_ids },
      refetchQueries: teamId
        ? [{ query: GET_TASKS, variables: { team_id: teamId } }]
        : [],
    });
  };

  return {
    stages: stageBuckets,
    loading: loading && Boolean(teamId),
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
