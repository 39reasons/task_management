import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import type { Task } from "@shared/types";
import { GET_COMMENTS, ADD_COMMENT, UPDATE_TASK } from "../../graphql.js";

interface TaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskModal({ task, isOpen, onClose }: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [initialTitle, setInitialTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [status, setStatus] = useState<Task["status"]>("todo");
  const [commentText, setCommentText] = useState("");

  const { data, loading } = useQuery(GET_COMMENTS, {
    variables: { taskId: task?.id },
    skip: !task,
  });

  const [addComment] = useMutation(ADD_COMMENT, {
    refetchQueries: task
      ? [{ query: GET_COMMENTS, variables: { taskId: task.id } }]
      : [],
  });

  const [updateTask] = useMutation(UPDATE_TASK);

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setInitialTitle(task.title || "");
      setDescription(task.description || "");
      setDueDate(task.dueDate || "");
      setPriority(task.priority || "medium");
      setStatus(task.status || "todo");
    }
  }, [task]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        const active = document.activeElement as HTMLElement | null;

        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
          active.blur();
          return;
        }

        saveAllChanges();
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, title, description, dueDate, priority, status]);

  if (!isOpen || !task) return null;

  const saveAllChanges = () => {
    if (!task) return;

    if (!title.trim()) {
      setTitle(initialTitle);
    } else if (title !== initialTitle) {
      updateTask({ variables: { id: task.id, title } });
      setInitialTitle(title);
    }

    if (description !== task.description) {
      updateTask({ variables: { id: task.id, description } });
    }

    if (dueDate !== task.dueDate) {
      updateTask({ variables: { id: task.id, dueDate: dueDate || null } });
    }

    if (priority !== task.priority) {
      updateTask({ variables: { id: task.id, priority } });
    }

    if (status !== task.status) {
      updateTask({ variables: { id: task.id, status } });
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await addComment({ variables: { taskId: task.id, content: commentText } });
    setCommentText("");
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          saveAllChanges();
          onClose();
        }
      }}
    >
      <div className="bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Editable Title */}
{isEditingTitle ? (
  <input
    type="text"
    value={title}
    autoFocus
    onChange={(e) => setTitle(e.target.value)}
    onBlur={() => {
      if (!title.trim()) {
        setTitle(initialTitle); // reset if empty
      } else if (title !== initialTitle) {
        updateTask({ variables: { id: task.id, title } });
        setInitialTitle(title);
      }
      setIsEditingTitle(false);
    }}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        (e.currentTarget as HTMLInputElement).blur(); // triggers onBlur save/reset
      }
    }}
    className="w-full mb-4 px-3 py-2 rounded-md bg-gray-900 text-white border border-gray-600 text-xl font-bold"
  />
) : (
  <h2
    className="text-xl font-bold text-white mb-4 cursor-pointer hover:underline"
    onClick={() => setIsEditingTitle(true)}
  >
    {title}
  </h2>
)}


        {/* Description */}
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => updateTask({ variables: { id: task.id, description } })}
          className="w-full mb-3 px-3 py-2 rounded-md bg-gray-900 text-white border border-gray-600"
        />

        {/* Due Date */}
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Due Date
        </label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => {
            setDueDate(e.target.value);
            updateTask({
              variables: { id: task.id, dueDate: e.target.value || null },
            });
          }}
          className="w-full mb-3 px-3 py-2 rounded-md bg-gray-900 text-white border border-gray-600"
        />

        {/* Priority */}
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Priority
        </label>
        <select
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value as Task["priority"]);
            updateTask({ variables: { id: task.id, priority: e.target.value } });
          }}
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
          onChange={(e) => {
            setStatus(e.target.value as Task["status"]);
            updateTask({ variables: { id: task.id, status: e.target.value } });
          }}
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
                <li
                  key={c.id}
                  className="bg-gray-900 p-2 rounded border border-gray-700"
                >
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
            <button className="bg-blue-600 px-4 rounded text-white">
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
