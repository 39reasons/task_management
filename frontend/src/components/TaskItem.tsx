import { useMutation } from "@apollo/client";
import { TOGGLE_TASK, DELETE_TASK, GET_TASKS } from "../graphql";
import type { Task } from "@shared/types";

type Props = {
  task: Task;
};

export function TaskItem({ task }: Props) {
  const [toggleTask] = useMutation(TOGGLE_TASK, {
    refetchQueries: [{ query: GET_TASKS }],
  });

  const [deleteTask] = useMutation(DELETE_TASK, {
    refetchQueries: [{ query: GET_TASKS }],
  });

  return (
    <li>
      <span
        onClick={() => toggleTask({ variables: { id: task.id } })}
        style={{
          textDecoration: task.completed ? "line-through" : "none",
          cursor: "pointer",
        }}
        title="Click to toggle"
      >
        {task.title} {task.completed ? "✅" : "❌"}
      </span>
      <button onClick={() => deleteTask({ variables: { id: task.id } })}>
        🗑️
      </button>
    </li>
  );
}
