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
import { useParams } from "react-router-dom";

export function useTasks() {
  const { id } = useParams<{ id: string }>();
  const projectId = id;

  const variables = projectId ? { projectId } : {};

  console.log("useTasks → projectId:", projectId, "variables:", variables);

  const { data, loading, error } = useQuery<{ tasks: Task[] }>(GET_TASKS, {
    variables,
  });

  const [deleteTask] = useMutation(DELETE_TASK, {
    refetchQueries: [{ query: GET_TASKS, variables }],
  });

  const [addTask] = useMutation(ADD_TASK, {
    refetchQueries: [
      { query: GET_TASKS, variables },   // project-scoped
      { query: GET_TASKS, variables: {} } // all-tasks
    ],
  });


  const [updatePriority] = useMutation(UPDATE_TASK_PRIORITY, {
    refetchQueries: [{ query: GET_TASKS, variables }],
  });

  const [updateStatus] = useMutation(UPDATE_TASK_STATUS, {
    refetchQueries: [{ query: GET_TASKS, variables }],
  });

  const [updateTask] = useMutation(UPDATE_TASK, {
    refetchQueries: [{ query: GET_TASKS, variables }],
  });

  return {
    tasks: data?.tasks ?? [],
    loading,
    error,
    deleteTask,
    addTask,
    updatePriority,
    updateStatus,
    updateTask,
    projectId: projectId ?? null,
  };
}
