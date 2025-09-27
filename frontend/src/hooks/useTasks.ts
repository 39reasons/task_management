import { useQuery, useMutation } from "@apollo/client";
import { GET_TASKS, TOGGLE_TASK, DELETE_TASK, ADD_TASK, UPDATE_TASK_PRIORITY, UPDATE_TASK_STATUS } from "../graphql";

export function useTasks() {
  const { data } = useQuery(GET_TASKS);
  
  const [toggleTask] = useMutation(TOGGLE_TASK, {
    refetchQueries: [{ query: GET_TASKS }],
  });

  const [deleteTask] = useMutation(DELETE_TASK, {
    refetchQueries: [{ query: GET_TASKS }],
  });

  const [addTask] = useMutation(ADD_TASK, {
    refetchQueries: [{ query: GET_TASKS }],
  });

  const [updatePriority] = useMutation(UPDATE_TASK_PRIORITY, {
    refetchQueries: [{ query: GET_TASKS }],
  });

  const [updateStatus] = useMutation(UPDATE_TASK_STATUS, { refetchQueries: [{ query: GET_TASKS }] });

  return {
    tasks: data?.tasks || [],
    toggleTask,
    deleteTask,
    addTask,
    updatePriority,
    updateStatus
  };
}
