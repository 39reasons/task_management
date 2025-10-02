import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import type { Task } from "@shared/types";
import {
  GET_COMMENTS,
  ADD_COMMENT,
  UPDATE_TASK,
  GET_TASK_TAGS, // ✅ use task tags, not project tags
  ADD_TAG,
  ASSIGN_TAG_TO_TASK,
} from "../../graphql.js";
import { SendHorizonal, Plus } from "lucide-react";
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

  const [tags, setTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");

  const { data, loading } = useQuery(GET_COMMENTS, {
    variables: { task_id: task?.id },
    skip: !task,
  });

  // ✅ fetch only tags attached to this task
  const { data: tagsData, refetch: refetchTags } = useQuery(GET_TASK_TAGS, {
    variables: { task_id: task?.id },
    skip: !task,
  });

  const [addComment] = useMutation(ADD_COMMENT, {
    refetchQueries: task
      ? [{ query: GET_COMMENTS, variables: { task_id: task.id } }]
      : [],
  });

  const [updateTask] = useMutation(UPDATE_TASK);
  const [addTag] = useMutation(ADD_TAG);
  const [assignTagToTask] = useMutation(ASSIGN_TAG_TO_TASK);

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

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    const res = await addTag({
      variables: {
        project_id: task.project_id,
        name: newTagName,
        color: newTagColor,
      },
    });
    const tag_id = res.data.addTag.id;
    await assignTagToTask({ variables: { task_id: task.id, tagId: tag_id } });
    await refetchTags();
    setNewTagName("");
    setNewTagColor("#3b82f6");
    setIsTagModalOpen(false);
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
            <div className="relative mb-4">
              <input
                type="text"
                value={title}
                autoFocus
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.currentTarget as HTMLInputElement).blur();
                  }
                }}
                onBlur={() => {
                  if (!title.trim()) setTitle(initialTitle);
                  else if (title !== initialTitle) {
                    updateTask({ variables: { id: task.id, title } });
                    setInitialTitle(title);
                  }
                  setIsEditingTitle(false);
                }}
                className="w-full px-3 py-2 pr-10 rounded-md bg-gray-900 text-white border border-gray-600 text-xl font-bold"
              />
              {title.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    if (!title.trim()) {
                      setTitle(initialTitle);
                    } else if (title !== initialTitle) {
                      updateTask({ variables: { id: task.id, title } });
                      setInitialTitle(title);
                    }
                    setIsEditingTitle(false);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors cursor-pointer"
                >
                  <SendHorizonal size={20} strokeWidth={2} />
                </button>
              )}
            </div>
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
                        variables: { id: task.id, due_date: e.target.value || null },
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

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2 items-center">
                {tags.length > 0 ? (
                  <>
                    {tags.map((tag) => (
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
                      onClick={() => setIsTagModalOpen(true)}
                      className="w-6 h-6 flex items-center justify-center bg-gray-700 text-white rounded hover:bg-gray-600"
                      title="Add another tag"
                    >
                      <Plus size={14} />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsTagModalOpen(true)}
                    className="w-8 h-8 flex items-center justify-center bg-gray-700 text-white rounded hover:bg-gray-600"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>
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
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tag Modal */}
      {isTagModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsTagModalOpen(false);
          }}
        >
          <div className="bg-gray-800 rounded-xl shadow-lg w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Add Tag</h3>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name"
              className="w-full px-3 py-2 rounded-md bg-gray-900 text-white border border-gray-600"
            />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Color
              </label>
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-12 h-12 p-1 border border-gray-600 rounded cursor-pointer"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsTagModalOpen(false)}
                className="px-3 py-1 rounded bg-gray-700 text-white hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTag}
                className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
