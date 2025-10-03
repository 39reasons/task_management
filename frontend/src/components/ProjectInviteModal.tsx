import { useState, useEffect } from "react";
import { useMutation, useLazyQuery } from "@apollo/client";
import { SEND_PROJECT_INVITE, GET_NOTIFICATIONS, SEARCH_USERS } from "../graphql";
import { useModal } from "./ModalStack";

interface ProjectInviteModalProps {
  projectId: string | null;
  onClose?: () => void;
}

type UserSuggestion = {
  id: string;
  name: string;
  username: string;
};

export function ProjectInviteModal({ projectId, onClose }: ProjectInviteModalProps) {
  const { modals, closeModal } = useModal();
  const isOpen = modals.includes("invite");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sendInvite, { loading }] = useMutation(SEND_PROJECT_INVITE, {
    refetchQueries: [{ query: GET_NOTIFICATIONS }],
  });
  const [searchUsers, { data: searchData, loading: searching }] = useLazyQuery(SEARCH_USERS, {
    fetchPolicy: "no-cache",
  });
  const suggestions = (searchData?.searchUsers ?? []) as UserSuggestion[];
  const trimmedUsername = username.trim();

  useEffect(() => {
    if (!isOpen) {
      setUsername("");
      setError(null);
      setSuccess(null);
      onClose?.();
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const trimmed = username.trim();
    const handle = setTimeout(() => {
      if (trimmed.length >= 2) {
        searchUsers({ variables: { query: trimmed } });
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [username, isOpen, searchUsers]);

  if (!isOpen || !projectId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username.trim()) {
      setError("Enter a username");
      return;
    }

    try {
      const trimmed = username.trim();
      await sendInvite({
        variables: { project_id: projectId, username: username.trim() },
      });
      setUsername(trimmed);
      setSuccess(`Invite sent to @${trimmed}.`);
      setTimeout(() => {
        closeModal("invite");
      }, 800);
    } catch (err: any) {
      setError(err.message ?? "Failed to send invite");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => closeModal("invite")} />
      <div className="relative bg-gray-800 rounded-xl shadow-lg w-full max-w-sm p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">Invite to Project</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full px-3 py-2 rounded-md bg-gray-900 text-white border border-gray-600"
              autoFocus
            />
            {searching && <p className="text-xs text-gray-500 mt-1">Searching…</p>}
            {!searching && trimmedUsername.length >= 2 && suggestions.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">No users found.</p>
            )}
            {!searching && trimmedUsername.length >= 2 && suggestions.length > 0 && (
              <div className="mt-2 border border-gray-700 rounded-md bg-gray-900 max-h-40 overflow-y-auto">
                {suggestions.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setUsername(user.username);
                      setError(null);
                      setSuccess(null);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-800 border-b border-gray-800 last:border-0"
                  >
                    <span className="font-medium">{user.name}</span>
                    <span className="text-gray-400 text-xs ml-2">@{user.username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-green-400">{success}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => closeModal("invite")}
              className="px-3 py-1 rounded bg-gray-700 text-white hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              Send Invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
