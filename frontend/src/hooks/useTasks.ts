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

const DEFAULT_PROJECT_ID = "1";

export function useTasks() {
  const { data, loading, error } = useQuery<{ tasks: Task[] }>(GET_TASKS, {
    variables: { projectId: DEFAULT_PROJECT_ID },
  });

  const [deleteTask] = useMutation(DELETE_TASK, {
    refetchQueries: [{ query: GET_TASKS, variables: { projectId: DEFAULT_PROJECT_ID } }],
  });

  const [addTask] = useMutation(ADD_TASK, {
    refetchQueries: [{ query: GET_TASKS, variables: { projectId: DEFAULT_PROJECT_ID } }],
  });

  const [updatePriority] = useMutation(UPDATE_TASK_PRIORITY, {
    refetchQueries: [{ query: GET_TASKS, variables: { projectId: DEFAULT_PROJECT_ID } }],
  });

  const [updateStatus] = useMutation(UPDATE_TASK_STATUS, {
    refetchQueries: [{ query: GET_TASKS, variables: { projectId: DEFAULT_PROJECT_ID } }],
  });

  const [updateTask] = useMutation(UPDATE_TASK, {
    refetchQueries: [{ query: GET_TASKS, variables: { projectId: DEFAULT_PROJECT_ID } }],
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
