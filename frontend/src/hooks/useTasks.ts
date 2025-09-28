import { useQuery, useMutation } from "@apollo/client";
import {
  GET_TASKS,
  DELETE_TASK,
  ADD_TASK,
  UPDATE_TASK_PRIORITY,
  UPDATE_TASK_STATUS,
  UPDATE_TASK,
} from "../graphql";
import type { Task } from "@shared/types";

export function useTasks(projectId: string | null) {
  const { data, loading, error } = useQuery<{ tasks: Task[] }>(GET_TASKS, {
    variables: { projectId },
  });

  const [deleteTask] = useMutation(DELETE_TASK, {
    refetchQueries: [{ query: GET_TASKS, variables: { projectId } }],
  });

  const [addTask] = useMutation(ADD_TASK, {
    refetchQueries: [{ query: GET_TASKS, variables: { projectId } }],
  });

  const [updatePriority] = useMutation(UPDATE_TASK_PRIORITY, {
    refetchQueries: [{ query: GET_TASKS, variables: { projectId } }],
  });

  const [updateStatus] = useMutation(UPDATE_TASK_STATUS, {
    refetchQueries: [{ query: GET_TASKS, variables: { projectId } }],
  });

  const [updateTask] = useMutation(UPDATE_TASK, {
    refetchQueries: [{ query: GET_TASKS, variables: { projectId } }],
  });

  return {
    tasks: data?.tasks || [],
    loading,
    error,
    deleteTask,
    addTask,
    updatePriority,
    updateStatus,
    updateTask,
  };
}
