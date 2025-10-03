import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { GET_PROJECT_MEMBERS, SET_TASK_MEMBERS, GET_WORKFLOWS, GET_TASKS } from "../graphql";
import type { Task, User } from "@shared/types";
import { useModal } from "./ModalStack";
import { getFullName, getInitials } from "../utils/user";
import { DEFAULT_AVATAR_COLOR } from "../constants/colors";

interface MemberModalProps {
  task: Task | null;
  onAssign?: (task: Task) => void;
}

type ProjectMember = Pick<User, "id" | "first_name" | "last_name" | "username" | "avatar_color">;

export function MemberModal({ task, onAssign }: MemberModalProps) {
  const { modals, closeModal } = useModal();
  const isOpen = modals.includes("member");

  const project_id = task?.project_id ?? null;

  const { data, loading } = useQuery(GET_PROJECT_MEMBERS, {
    variables: { project_id },
    skip: !isOpen || !project_id,
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [setTaskMembers] = useMutation(SET_TASK_MEMBERS);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeModal("member");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, closeModal]);

  useEffect(() => {
    if (isOpen && task) {
      const currentIds = (task.assignees ?? []).map((member) => member.id);
      setSelectedIds(currentIds);
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const members = (data?.projectMembers ?? []) as ProjectMember[];

  const refetchQueries = [
    { query: GET_WORKFLOWS, variables: { project_id: task.project_id } },
    { query: GET_TASKS, variables: {} },
    { query: GET_TASKS, variables: { project_id: task.project_id } },
  ];

  const toggleMember = (memberId: string) => {
    setSelectedIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSave = async () => {
    await setTaskMembers({
      variables: { task_id: task.id, member_ids: selectedIds },
      refetchQueries,
    });

    onAssign?.({
      ...task,
      assignees: members.filter((member) => selectedIds.includes(member.id)),
    });
    closeModal("member");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => closeModal("member")} />

      <div className="relative bg-gray-800 rounded-xl shadow-lg w-full max-w-sm p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">Assign Member</h3>

        {loading ? (
          <p className="text-sm text-gray-400">Loading members...</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Select members to assign:</span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-xs text-gray-400 hover:text-gray-200"
              >
                Clear all
              </button>
            </div>

            {members.length === 0 ? (
              <p className="text-xs text-gray-500">No project members yet.</p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => {
                  const isSelected = selectedIds.includes(member.id);
                  return (
                    <label
                      key={member.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-md border transition cursor-pointer ${
                        isSelected
                          ? "border-blue-600 bg-blue-600/20"
                          : "border-gray-700 bg-gray-900 hover:border-gray-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold uppercase text-white"
                          style={{ backgroundColor: member.avatar_color || DEFAULT_AVATAR_COLOR }}
                        >
                          {getInitials(member)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-white">{getFullName(member)}</span>
                          <span className="text-xs text-gray-300">@{member.username}</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleMember(member.id)}
                        className="h-4 w-4"
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => closeModal("member")}
            className="px-3 py-1 rounded bg-gray-700 text-white hover:bg-gray-600"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="ml-2 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
