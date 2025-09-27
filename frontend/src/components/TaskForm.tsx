import { useState } from "react";
import { useMutation } from "@apollo/client";
import { ADD_TASK, GET_TASKS } from "../graphql";

export function TaskForm() {
  const [title, setTitle] = useState("");

  const [addTask] = useMutation(ADD_TASK, {
    refetchQueries: [{ query: GET_TASKS }],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTask({ variables: { title } });
    setTitle("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        placeholder="New task..."
        onChange={(e) => setTitle(e.target.value)}
      />
      <button type="submit">Add Task</button>
    </form>
  );
}
