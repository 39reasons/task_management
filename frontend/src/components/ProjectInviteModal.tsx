import { useState, useEffect, useMemo, KeyboardEvent } from "react";
import { useLazyQuery, useMutation } from "@apollo/client";
import {
  SEND_PROJECT_INVITE,
  GET_NOTIFICATIONS,
  SEARCH_USERS,
} from "../graphql";
import { useModal } from "./ModalStack";

interface ProjectInviteModalProps {
  projectId: string | null;
  onClose?: () => void;
}

interface UserSuggestion {
  id: string;
  name: string;
  username: string;
}

export function ProjectInviteModal({ projectId, onClose }: ProjectInviteModalProps) {
  const { modals, closeModal } = useModal();
  const isOpen = modals.includes("invite");

  const [query, setQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<UserSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [sendInvite, { loading }] = useMutation(SEND_PROJECT_INVITE, {
    refetchQueries: [{ query: GET_NOTIFICATIONS }],
  });
  const [runSearch, { data: searchData, loading: searching }] = useLazyQuery(SEARCH_USERS, {
    fetchPolicy: "no-cache",
  });

  const suggestions: UserSuggestion[] = useMemo(() => {
    const results = (searchData?.searchUsers ?? []) as UserSuggestion[];
    const selectedIds = new Set(selectedUsers.map((u) => u.id));
    return results.filter((u) => !selectedIds.has(u.id));
  }, [searchData, selectedUsers]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSelectedUsers([]);
      setActiveIndex(-1);
      setError(null);
      setSuccess(null);
      setShowSuggestions(false);
      onClose?.();
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim();
    const handle = setTimeout(() => {
      if (trimmed.length >= 2) {
        setShowSuggestions(true);
        setActiveIndex(-1);
        runSearch({ variables: { query: trimmed } }).catch(() => {});
      } else {
        setShowSuggestions(false);
        setActiveIndex(-1);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query, isOpen, runSearch]);

  if (!isOpen || !projectId) return null;

  const toggleUser = (user: UserSuggestion) => {
    setSelectedUsers((prev) => {
      if (prev.some((u) => u.id === user.id)) {
        return prev.filter((u) => u.id !== user.id);
      }
      return [...prev, user];
    });
    setQuery("");
    setShowSuggestions(false);
    setActiveIndex(-1);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (selectedUsers.length === 0) {
      setError("Select at least one user to invite.");
      return;
    }

    try {
      for (const user of selectedUsers) {
        await sendInvite({
          variables: { project_id: projectId, username: user.username },
        });
      }
      setSuccess(`Invited ${selectedUsers.length} user${selectedUsers.length > 1 ? "s" : ""}.`);
      setSelectedUsers([]);
      setQuery("");
      setShowSuggestions(false);
      setTimeout(() => {
        closeModal("invite");
      }, 800);
    } catch (err: any) {
      setError(err.message ?? "Failed to send invite");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        toggleUser(suggestions[activeIndex]);
      }
    }
  };

  const removeSelected = (id: string) => {
    setSelectedUsers((prev) => prev.filter((user) => user.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => closeModal("invite")} />
      <div className="relative bg-gray-800 rounded-xl shadow-lg w-full max-w-sm p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">Invite Members</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Search users</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a username or name"
              className="w-full px-3 py-2 rounded-md bg-gray-900 text-white border border-gray-600"
              autoFocus
            />
            {searching && <p className="text-xs text-gray-500 mt-1">Searching…</p>}
            {!searching && showSuggestions && query.trim().length >= 2 && suggestions.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">No users found.</p>
            )}
            {!searching && showSuggestions && suggestions.length > 0 && (
              <div className="mt-2 border border-gray-700 rounded-md bg-gray-900 max-h-40 overflow-y-auto">
                {suggestions.map((user, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleUser(user)}
                      className={`w-full text-left px-3 py-2 text-sm border-b border-gray-800 last:border-0 flex items-center justify-between ${
                        isActive ? "bg-gray-700" : "hover:bg-gray-800"
                      } text-white`}
                    >
                      <div>
                        <span className="font-medium">{user.name}</span>
                        <span className="text-gray-400 text-xs ml-2">@{user.username}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <span
                  key={user.id}
                  className="px-2 py-1 bg-gray-700 text-xs rounded-full flex items-center gap-2"
                >
                  <span>{user.name}</span>
                  <button
                    type="button"
                    onClick={() => removeSelected(user.id)}
                    className="text-gray-300 hover:text-red-400"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

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
              disabled={loading || selectedUsers.length === 0}
              className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              Send Invites
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
