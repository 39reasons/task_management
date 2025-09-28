import { useQuery, useMutation } from "@apollo/client";
import {
  GET_TASKS,
  DELETE_TASK,
  ADD_TASK,
  UPDATE_TASK_PRIORITY,
  UPDATE_TASK_STATUS,
} from "../graphql";
import type { Task } from "@shared/types";

export function useTasks() {
  const { data, loading, error } = useQuery<{ tasks: Task[] }>(GET_TASKS);

  const [deleteTask] = useMutation(DELETE_TASK, {
    refetchQueries: [{ query: GET_TASKS }],
  });

  const [addTask] = useMutation(ADD_TASK, {
    refetchQueries: [{ query: GET_TASKS }],
  });

  const [updatePriority] = useMutation(UPDATE_TASK_PRIORITY, {
    refetchQueries: [{ query: GET_TASKS }],
  });

  const [updateStatus] = useMutation(UPDATE_TASK_STATUS, {
    refetchQueries: [{ query: GET_TASKS }],
  });

  return {
    tasks: data?.tasks || [],
    loading,
    error,
    deleteTask,
    addTask,
    updatePriority,
    updateStatus,
  };
}
