import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import type { Task } from "@shared/types";
import { GET_COMMENTS, ADD_COMMENT } from "../../graphql.js";

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

  const [commentText, setCommentText] = useState("");

  // Fetch comments for this task
  const { data, loading } = useQuery(GET_COMMENTS, {
    variables: { taskId: task?.id },
    skip: !task,
  });

  const [addComment] = useMutation(ADD_COMMENT, {
    refetchQueries: task
      ? [{ query: GET_COMMENTS, variables: { taskId: task.id } }]
      : [],
  });

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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await addComment({ variables: { taskId: task.id, content: commentText } });
    setCommentText("");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
          className="w-full mb-4 px-3 py-2 rounded-md bg-gray-900 text-white border border-gray-600"
        >
          <option value="todo">Todo</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>

        {/* Comments */}
        <div className="mt-6">
          <h3 className="font-semibold text-white">Comments</h3>
          {loading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : (
            <ul className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {data?.task?.comments.map((c: any) => (
                <li key={c.id} className="bg-gray-900 p-2 rounded border border-gray-700">
                  <span className="text-sm text-gray-300">{c.content}</span>
                  <span className="block text-xs text-gray-500 mt-1">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddComment} className="mt-2 flex gap-2">
            <input
              type="text"
              className="flex-1 rounded p-2 bg-gray-700 text-white border border-gray-600"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button className="bg-blue-600 px-4 rounded text-white">Send</button>
          </form>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6">
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
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
