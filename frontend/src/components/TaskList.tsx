import { useQuery } from "@apollo/client";
import { GET_TASKS } from "../graphql";
import TaskItem from "./TaskItem";
import type { TasksData } from "@shared/types";

export default function TaskList() {
  const { data, loading, error } = useQuery<TasksData>(GET_TASKS);

  if (loading) return <p>Loading tasks...</p>;
  if (error) return <p>Error loading tasks</p>;

  return (
    <div className="task-list">
      {data?.tasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  );
}
