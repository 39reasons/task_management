import { useQuery } from "@apollo/client";
import { GET_TASKS } from "../graphql";
import { TaskItem } from "./TaskItem";
import type { TasksData } from "@shared/types";

export function TaskList() {
  const { loading, error, data } = useQuery<TasksData>(GET_TASKS);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error 😢 {error.message}</p>;

  return (
    <ul>
      {data?.tasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </ul>
  );
}
