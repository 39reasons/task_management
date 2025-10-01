import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import type { Task } from "@shared/types";
import { GET_COMMENTS, ADD_COMMENT, UPDATE_TASK } from "../../graphql.js";
import { SendHorizonal } from "lucide-react";
import { Dropdown } from "../Dropdown.js";

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
  const [priority, setPriority] = useState<Task["priority"] | null>(null);
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
      setPriority(task.priority ?? null);
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
  }, [isOpen, title, description, dueDate, priority]);

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
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await addComment({ variables: { taskId: task.id, content: commentText } });
    setCommentText("");
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          saveAllChanges();
          onClose();
        }
      }}
    >
      <div
        className="
          bg-gray-800 rounded-xl shadow-lg w-full max-w-4xl
          max-h-[80vh] overflow-hidden
          grid grid-cols-1 md:grid-cols-2 gap-6 p-6
        "
      >
        <div className="flex flex-col min-h-0 pr-2">
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                if (!title.trim()) setTitle(initialTitle);
                else if (title !== initialTitle) {
                  updateTask({ variables: { id: task.id, title } });
                  setInitialTitle(title);
                }
                setIsEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
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

          <div className="flex-1 overflow-y-auto min-h-0 space-y-3">
            {description && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() =>
                    updateTask({ variables: { id: task.id, description } })
                  }
                  className="w-full px-3 py-2 rounded-md bg-gray-900 text-white border border-gray-600"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              {dueDate && (
                <div className="flex-1 min-w-[10rem]">
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
                    className="w-full px-3 py-2 rounded-md bg-gray-900 text-white border border-gray-600"
                  />
                </div>
              )}

              {priority && (
                <div className="flex-1 min-w-[8rem]">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Priority
                  </label>
                  <Dropdown
                    value={priority}
                    options={["low", "medium", "high"]}
                    onChange={(val) => setPriority(val as Task["priority"])}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col pl-2">
          <form onSubmit={handleAddComment} className="mb-2">
            <div className="relative w-full">
              <input
                type="text"
                className="w-full rounded p-2 pr-16 bg-gray-700 text-white border border-gray-600"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              {commentText.trim() && (
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors cursor-pointer"
                >
                  <SendHorizonal size={18} strokeWidth={2} />
                </button>
              )}
            </div>
          </form>

          <h3 className="font-semibold text-white mb-2">Comments</h3>

          <div className="overflow-y-auto min-h-0 pr-2 space-y-2 max-h-[calc(80vh-10rem)]">
            {loading ? (
              <p className="text-gray-400 text-sm">Loading...</p>
            ) : (
              data?.task?.comments.map((c: any) => (
                <div
                  key={c.id}
                  className="bg-gray-900 p-2 rounded border border-gray-700"
                >
                  <span className="text-sm text-gray-300">{c.content}</span>
                  <span className="block text-xs text-gray-500 mt-1">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
