import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import type { Task } from "@shared/types";
import {
  GET_COMMENTS,
  ADD_COMMENT,
  UPDATE_TASK,
  GET_TASK_TAGS,
} from "../../graphql";
import { SendHorizonal, Plus, Dot } from "lucide-react";
import { useModal } from "../ModalStack";

interface TaskModalProps {
  task: Task | null;
}

// ⏱️ Time ago helper
function timeAgo(timestamp: number) {
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000); // in seconds

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo ago`;
  return `${Math.floor(diff / 31536000)}y ago`;
}

export function TaskModal({ task }: TaskModalProps) {
  const { modals, closeModal, openModal } = useModal();
  const isOpen = modals.includes("task");

  const [title, setTitle] = useState("");
  const [initialTitle, setInitialTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Task["priority"] | null>(null);
  const [commentText, setCommentText] = useState("");
  const [tags, setTags] = useState<{ id: string; name: string; color: string }[]>([]);

  const { data, loading } = useQuery(GET_COMMENTS, {
    variables: { task_id: task?.id },
    skip: !task,
  });

  const { data: tagsData } = useQuery(GET_TASK_TAGS, {
    variables: { task_id: task?.id },
    skip: !task,
  });

  const [addComment] = useMutation(ADD_COMMENT, {
    refetchQueries: task ? [{ query: GET_COMMENTS, variables: { task_id: task.id } }] : [],
  });

  const [updateTask] = useMutation(UPDATE_TASK);

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setInitialTitle(task.title || "");
      setDescription(task.description || "");
      setDueDate(task.due_date || "");
      setPriority(task.priority ?? null);
    }
  }, [task]);

  useEffect(() => {
    if (tagsData?.task?.tags) {
      setTags(tagsData.task.tags);
    }
  }, [tagsData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.stopPropagation();
        saveAllChanges();
        closeModal("task");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
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

    if (dueDate !== task.due_date) {
      updateTask({ variables: { id: task.id, due_date: dueDate || null } });
    }

    if (priority !== task.priority) {
      updateTask({ variables: { id: task.id, priority } });
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await addComment({ variables: { task_id: task.id, content: commentText } });
    setCommentText("");
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center pt-16">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          saveAllChanges();
          closeModal("task");
        }}
      />

      {/* Content */}
      <div
        id="task-modal-root"
        className="
          relative bg-gray-800 rounded-xl shadow-lg w-full max-w-4xl
          max-h-[80vh] overflow-hidden
          grid grid-cols-1 md:grid-cols-2 gap-6 p-6
        "
      >
        {/* Left side */}
        <div className="flex flex-col min-h-0 pr-2">
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              className="w-full px-3 py-2 pr-10 rounded-md bg-gray-900 text-white border border-gray-600 text-xl font-bold"
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
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => updateTask({ variables: { id: task.id, description } })}
                className="w-full px-3 py-2 rounded-md bg-gray-900 text-white border border-gray-600"
              />
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-2 items-center">
              {tags.length > 0 &&
                tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2 py-1 text-xs rounded-full"
                    style={{ backgroundColor: tag.color, color: "white" }}
                  >
                    {tag.name}
                  </span>
                ))}

              <button
                type="button"
                onClick={() => openModal("tag")}
                className="flex items-center gap-1 px-2 py-1 rounded bg-gray-700 text-white text-xs hover:bg-gray-600"
              >
                <Plus size={14} />
                Tags
              </button>
            </div>
          </div>
        </div>

        {/* Right side (comments) */}
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
                  {/* Header */}
                  <div className="flex items-center gap-1 text-xs mb-1">
                    <span className="font-semibold text-white">
                      {c.user?.name || "Unknown"}
                    </span>
                    <Dot size={14} className="text-gray-500" />
                    <span className="text-gray-400">
                      {timeAgo(Number(c.created_at))}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="text-sm text-gray-300 leading-snug">
                    {c.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
