import { useState, useEffect } from "react";
import type { Task } from "@shared/types";

interface TaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTask: Partial<Task>) => void;
}

export function TaskModal({ task, isOpen, onClose, onSave }: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [status, setStatus] = useState<Task["status"]>("todo");

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setDueDate(task.dueDate || "");
      setPriority(task.priority || "medium");
      setStatus(task.status || "todo");
    }
  }, [task]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Edit Task</h2>

        {/* Title */}
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-md bg-gray-900 text-white border border-gray-600"
        />

        {/* Description */}
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-md bg-gray-900 text-white border border-gray-600"
        />

        {/* Due Date */}
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Due Date
        </label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-md bg-gray-900 text-white border border-gray-600"
        />

        {/* Priority */}
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Priority
        </label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Task["priority"])}
          className="w-full mb-3 px-3 py-2 rounded-md bg-gray-900 text-white border border-gray-600"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        {/* Status */}
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Task["status"])}
          className="w-full mb-3 px-3 py-2 rounded-md bg-gray-900 text-white border border-gray-600"
        >
          <option value="todo">Todo</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-700 text-white hover:bg-gray-600"
          >
            Cancel
          </button>
        <button
          onClick={() => {
            const payload = {
              id: task.id,
              title,
              description,
              dueDate,
              priority,
              status,
            };
            onSave(payload);
          }}
          className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary-dark"
        >
          Save
        </button>
        </div>
      </div>
    </div>
  );
}
