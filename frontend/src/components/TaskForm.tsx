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
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      />
      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
      >
        Add
      </button>
    </form>
  );
}

export default TaskForm;
