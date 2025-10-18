import { useCallback, useState } from "react";
import { useMutation } from "@apollo/client";

import { DELETE_TASK, REORDER_BACKLOG_TASKS, UPDATE_TASK } from "../graphql";

import type { TaskStatus } from "@shared/types";

interface UseBacklogTaskActionsOptions {
  projectId: string | null;
  teamId: string | null;
  selectedBacklogId: string;
  isUnassignedView: boolean;
  refetchTasks: () => Promise<unknown>;
}

interface UseBacklogTaskActionsResult {
  taskActionError: string | null;
  dismissTaskActionError: () => void;
  updatingTaskIds: Set<string>;
  deletingTaskIds: Set<string>;
  isReorderingTasks: boolean;
  handleStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  handleDeleteTask: (taskId: string) => Promise<void>;
  handleReorderTasks: (orderedIds: string[]) => Promise<void>;
}

export function useBacklogTaskActions({
  projectId,
  teamId,
  selectedBacklogId,
  isUnassignedView,
  refetchTasks,
}: UseBacklogTaskActionsOptions): UseBacklogTaskActionsResult {
  const [updateTaskMutation] = useMutation(UPDATE_TASK);
  const [deleteTaskMutation] = useMutation(DELETE_TASK);
  const [reorderBacklogTasksMutation] = useMutation(REORDER_BACKLOG_TASKS);

  const [taskActionError, setTaskActionError] = useState<string | null>(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<Set<string>>(new Set());
  const [deletingTaskIds, setDeletingTaskIds] = useState<Set<string>>(new Set());
  const [isReorderingTasks, setIsReorderingTasks] = useState(false);

  const setTaskUpdating = useCallback((taskId: string, next: boolean) => {
    setUpdatingTaskIds((prev) => {
      const nextSet = new Set(prev);
      if (next) {
        nextSet.add(taskId);
      } else {
        nextSet.delete(taskId);
      }
      return nextSet;
    });
  }, []);

  const setTaskDeleting = useCallback((taskId: string, next: boolean) => {
    setDeletingTaskIds((prev) => {
      const nextSet = new Set(prev);
      if (next) {
        nextSet.add(taskId);
      } else {
        nextSet.delete(taskId);
      }
      return nextSet;
    });
  }, []);

  const dismissTaskActionError = useCallback(() => {
    setTaskActionError(null);
  }, []);

  const handleStatusChange = useCallback(
    async (taskId: string, status: TaskStatus) => {
      dismissTaskActionError();
      setTaskUpdating(taskId, true);
      try {
        await updateTaskMutation({
          variables: {
            id: taskId,
            status,
            stage_id: null,
            backlog_id: isUnassignedView ? null : selectedBacklogId,
          },
        });
        await refetchTasks();
      } catch (mutationError) {
        setTaskActionError((mutationError as Error).message ?? "Unable to update task status.");
      } finally {
        setTaskUpdating(taskId, false);
      }
    },
    [
      dismissTaskActionError,
      isUnassignedView,
      refetchTasks,
      selectedBacklogId,
      setTaskUpdating,
      updateTaskMutation,
    ]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      dismissTaskActionError();
      setTaskDeleting(taskId, true);
      try {
        await deleteTaskMutation({ variables: { id: taskId } });
        await refetchTasks();
      } catch (mutationError) {
        setTaskActionError((mutationError as Error).message ?? "Unable to delete task.");
      } finally {
        setTaskDeleting(taskId, false);
      }
    },
    [deleteTaskMutation, dismissTaskActionError, refetchTasks, setTaskDeleting]
  );

  const handleReorderTasks = useCallback(
    async (orderedIds: string[]) => {
      if (!projectId || !teamId || orderedIds.length === 0 || isReorderingTasks) {
        return;
      }

      const backlogId = isUnassignedView ? null : selectedBacklogId;

      dismissTaskActionError();
      setIsReorderingTasks(true);

      try {
        await reorderBacklogTasksMutation({
          variables: {
            project_id: projectId,
            team_id: teamId,
            backlog_id: backlogId,
            task_ids: orderedIds,
          },
        });
        await refetchTasks();
      } catch (mutationError) {
        setTaskActionError((mutationError as Error).message ?? "Unable to reorder tasks.");
        throw mutationError;
      } finally {
        setIsReorderingTasks(false);
      }
    },
    [
      dismissTaskActionError,
      isReorderingTasks,
      isUnassignedView,
      projectId,
      refetchTasks,
      reorderBacklogTasksMutation,
      teamId,
      selectedBacklogId,
    ]
  );

  return {
    taskActionError,
    dismissTaskActionError,
    updatingTaskIds,
    deletingTaskIds,
    isReorderingTasks,
    handleStatusChange,
    handleDeleteTask,
    handleReorderTasks,
  };
}
