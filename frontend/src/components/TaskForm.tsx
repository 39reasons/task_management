import { useState } from "react";

interface TaskFormProps {
  onAdd: (title: string) => void;
}

function TaskForm({ onAdd }: TaskFormProps) {
  const [newTask, setNewTask] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    onAdd(newTask);
    setNewTask("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        type="text"
        value={newTask}
        onChange={(e) => setNewTask(e.target.value)}
        placeholder="New task..."
        className="flex-1 bg-gray-800 border border-primary rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
      />
      <button
        type="submit"
        className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium shadow transition-colors"
      >
        Add
      </button>
    </form>
  );
}

export default TaskForm;
