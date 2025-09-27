import { useMutation } from "@apollo/client";
import { TOGGLE_TASK, DELETE_TASK, GET_TASKS } from "../graphql";
import type { Task } from "@shared/types";

interface TaskItemProps {
  task: Task;
}

export default function TaskItem({ task }: TaskItemProps) {
  const [toggleTask] = useMutation(TOGGLE_TASK, {
    refetchQueries: [{ query: GET_TASKS }],
  });
  const [deleteTask] = useMutation(DELETE_TASK, {
    refetchQueries: [{ query: GET_TASKS }],
  });

  return (
    <div className="task-item">
      <span
        onClick={() => toggleTask({ variables: { id: task.id } })}
        style={{ textDecoration: task.completed ? "line-through" : "none" }}
      >
        {task.title}
      </span>

      {task.description && <p>{task.description}</p>}
      {task.dueDate && <p>Due: {new Date(task.dueDate).toLocaleDateString()}</p>}
      <p>Priority: {task.priority}</p>
      <p>Status: {task.status}</p>

      <button onClick={() => deleteTask({ variables: { id: task.id } })}>
        🗑 Delete
      </button>
    </div>
  );
}
