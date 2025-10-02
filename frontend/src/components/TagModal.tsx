import { useState, useEffect } from "react";
import { useMutation } from "@apollo/client";
import { ADD_TAG, ASSIGN_TAG_TO_TASK, GET_TASK_TAGS } from "../graphql.js";
import type { Task } from "@shared/types";
import { useModal } from "./ModalStack";

interface TagModalProps {
  task: Task | null;
}

export function TagModal({ task }: TagModalProps) {
  const { modals, closeModal } = useModal();
  const isOpen = modals.includes("tag");

  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");

  const [addTag] = useMutation(ADD_TAG);
  const [assignTagToTask] = useMutation(ASSIGN_TAG_TO_TASK);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeModal("tag");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  if (!isOpen || !task) return null;

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

    await assignTagToTask({
      variables: { task_id: task.id, tag_id },
      refetchQueries: [{ query: GET_TASK_TAGS, variables: { task_id: task.id } }],
    });

    setNewTagName("");
    setNewTagColor("#3b82f6");
    closeModal("tag");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop only closes if tag modal is top */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => closeModal("tag")}
      />

      <div className="relative bg-gray-800 rounded-xl shadow-lg w-full max-w-sm p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">Add Tag</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddTag();
          }}
          className="space-y-4"
        >
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Tag name"
            className="w-full px-3 py-2 rounded-md bg-gray-900 text-white border border-gray-600"
            autoFocus
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
              type="button"
              onClick={() => closeModal("tag")}
              className="px-3 py-1 rounded bg-gray-700 text-white hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
