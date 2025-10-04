import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import type { AuthUser } from "@shared/types";
import { CURRENT_USER, UPDATE_USER_PROFILE } from "../graphql";
import { COLOR_WHEEL, DEFAULT_AVATAR_COLOR } from "../constants/colors";
import { getFullName, getInitials } from "../utils/user";

interface SettingsPageProps {
  onProfileUpdate: (user: AuthUser) => void;
}

const MAX_NAME_LENGTH = 32;
const MAX_USERNAME_LENGTH = 32;
const NAME_PATTERN = /^[A-Za-z]+$/;
const USERNAME_PATTERN = /^(?!.*[-_]{2})[A-Za-z0-9_-]+$/;

export default function SettingsPage({ onProfileUpdate }: SettingsPageProps) {
  const { data, loading, refetch } = useQuery(CURRENT_USER);
  const [updateProfile, { loading: saving }] = useMutation(UPDATE_USER_PROFILE);

  const currentUser = data?.currentUser as AuthUser | undefined;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarColor, setAvatarColor] = useState<string>(DEFAULT_AVATAR_COLOR);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setFirstName(currentUser.first_name);
      setLastName(currentUser.last_name);
      setUsername(currentUser.username);
      setAvatarColor(currentUser.avatar_color ?? DEFAULT_AVATAR_COLOR);
    }
  }, [currentUser]);

  const initials = useMemo(() => getInitials({ first_name: firstName, last_name: lastName }), [firstName, lastName]);

  const normalizeName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const [firstChar, ...rest] = trimmed;
    return `${firstChar.toUpperCase()}${rest.join("")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedUsername = username.trim();

    if (!trimmedFirst || !trimmedLast) {
      setError("Please provide both a first and last name.");
      return;
    }
    if (trimmedFirst.length > MAX_NAME_LENGTH) {
      setError(`First name cannot exceed ${MAX_NAME_LENGTH} characters.`);
      return;
    }
    if (trimmedLast.length > MAX_NAME_LENGTH) {
      setError(`Last name cannot exceed ${MAX_NAME_LENGTH} characters.`);
      return;
    }
    if (!NAME_PATTERN.test(trimmedFirst)) {
      setError("First name can only contain letters.");
      return;
    }
    if (!NAME_PATTERN.test(trimmedLast)) {
      setError("Last name can only contain letters.");
      return;
    }
    if (!trimmedUsername) {
      setError("Please choose a username.");
      return;
    }
    if (trimmedUsername.length > MAX_USERNAME_LENGTH) {
      setError(`Username cannot exceed ${MAX_USERNAME_LENGTH} characters.`);
      return;
    }
    if (!USERNAME_PATTERN.test(trimmedUsername)) {
      setError("Username can only contain letters, numbers, hyphens, or underscores.");
      return;
    }

    try {
      const { data: updateData } = await updateProfile({
        variables: {
          first_name: normalizeName(trimmedFirst),
          last_name: normalizeName(trimmedLast),
          username: trimmedUsername,
          avatar_color: avatarColor,
        },
      });

      const updated = updateData?.updateUserProfile;
      if (updated) {
        onProfileUpdate({
          id: updated.id,
          first_name: updated.first_name,
          last_name: updated.last_name,
          username: updated.username,
          avatar_color: updated.avatar_color ?? null,
        });
        setMessage("Profile updated successfully.");
        refetch();
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to update profile");
    }
  };

  if (loading && !currentUser) {
    return <div className="p-6 text-white">Loading settings…</div>;
  }

  if (!currentUser) {
    return <div className="p-6 text-white">Unable to load user profile.</div>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6 text-white">
      <div className="rounded-xl border border-gray-700 bg-gray-900/80 p-6 shadow">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold"
            style={{ backgroundColor: avatarColor || DEFAULT_AVATAR_COLOR }}
          >
            {initials}
          </div>
          <div>
            <p className="text-lg font-semibold">{getFullName({ first_name: firstName, last_name: lastName })}</p>
            <p className="text-sm text-gray-400">@{username}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-gray-700 bg-gray-900/80 p-6 shadow">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-gray-200">First name</span>
            <input
              value={firstName}
              onChange={(e) =>
                setFirstName(
                  e.target.value
                    .replace(/[^A-Za-z]/g, "")
                    .slice(0, MAX_NAME_LENGTH)
                )
              }
              onBlur={() => setFirstName(normalizeName(firstName))}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              required
              maxLength={MAX_NAME_LENGTH}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-gray-200">Last name</span>
            <input
              value={lastName}
              onChange={(e) =>
                setLastName(
                  e.target.value
                    .replace(/[^A-Za-z]/g, "")
                    .slice(0, MAX_NAME_LENGTH)
                )
              }
              onBlur={() => setLastName(normalizeName(lastName))}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              required
              maxLength={MAX_NAME_LENGTH}
            />
          </label>
        </div>

        <label className="space-y-2 text-sm">
          <span className="font-semibold text-gray-200">Username</span>
          <input
            value={username}
            onChange={(e) =>
              setUsername(
                e.target.value
                  .replace(/[^A-Za-z0-9_-]/g, "")
                  .replace(/([-_])\1+/g, "$1")
                  .slice(0, MAX_USERNAME_LENGTH)
              )
            }
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            required
            maxLength={MAX_USERNAME_LENGTH}
          />
        </label>

        <div className="space-y-2 text-sm">
          <span className="font-semibold text-gray-200">Avatar color</span>
          <div className="flex flex-wrap gap-3">
            {COLOR_WHEEL.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setAvatarColor(color)}
                className={`h-9 w-9 rounded-full border-2 transition ${
                  avatarColor === color ? "border-white" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
              />
            ))}
            <label className="flex items-center gap-2 rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-300">
              <span>Custom</span>
              <input
                type="color"
                value={avatarColor}
                onChange={(e) => setAvatarColor(e.target.value)}
                className="h-6 w-6 cursor-pointer rounded-full border-none bg-transparent p-0"
              />
            </label>
          </div>
        </div>

        {message && <p className="text-sm text-green-400">{message}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              if (currentUser) {
                setFirstName(currentUser.first_name);
                setLastName(currentUser.last_name);
                setUsername(currentUser.username);
                setAvatarColor(currentUser.avatar_color ?? DEFAULT_AVATAR_COLOR);
              }
              setMessage(null);
              setError(null);
            }}
            className="rounded-lg px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-800 hover:text-gray-100"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
