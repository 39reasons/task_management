import { useMutation } from "@apollo/client";
import { DELETE_TASK, GET_TASKS } from "../graphql";
import type { Task } from "@shared/types";

interface TaskItemProps {
  task: Task;
}

export default function TaskItem({ task }: TaskItemProps) {
  const [deleteTask] = useMutation(DELETE_TASK, {
    refetchQueries: [{ query: GET_TASKS }],
  });

  return (
    <div className="task-item">
      <span>
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
