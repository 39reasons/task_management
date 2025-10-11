import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import type { AuthUser } from "@shared/types";
import { CURRENT_USER, UPDATE_USER_PROFILE } from "../graphql";
import { COLOR_WHEEL, DEFAULT_AVATAR_COLOR } from "../constants/colors";
import { getFullName, getInitials } from "../utils/user";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "../components/ui";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

interface SettingsPageProps {
  onProfileUpdate: (user: AuthUser) => void;
}

const MAX_NAME_LENGTH = 32;
const MAX_USERNAME_LENGTH = 32;
const NAME_PATTERN = /^[A-Za-z]+$/;
const USERNAME_PATTERN = /^(?!.*[-_]{2})[A-Za-z0-9_-]+$/;

export default function SettingsPage({ onProfileUpdate }: SettingsPageProps) {
  const { data, loading, refetch } = useQuery(CURRENT_USER, {
    fetchPolicy: "network-only",
    nextFetchPolicy: "cache-first",
    errorPolicy: "all",
    returnPartialData: true,
  });
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

  const hasProfileChanges = useMemo(() => {
    if (!currentUser) return false;
    return (
      firstName !== currentUser.first_name ||
      lastName !== currentUser.last_name ||
      username !== currentUser.username ||
      (avatarColor ?? DEFAULT_AVATAR_COLOR) !== (currentUser.avatar_color ?? DEFAULT_AVATAR_COLOR)
    );
  }, [avatarColor, currentUser, firstName, lastName, username]);

  const normalizeName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const [firstChar, ...rest] = trimmed;
    return `${firstChar.toUpperCase()}${rest.join("")}`;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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

    if (!hasProfileChanges) {
      setMessage("You're already up to date.");
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
        void refetch();
      }
    } catch (err) {
      setError((err as Error).message ?? "Failed to update profile");
    }
  };

  if (loading && !currentUser) {
    return <div className="p-6 text-muted-foreground">Loading settings…</div>;
  }

  if (!currentUser) {
    return <div className="p-6 text-destructive">Unable to load user profile.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-10 pt-6 sm:px-6">
      <Card>
        <CardContent className="flex items-center gap-4 py-6">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-primary-foreground"
            style={{ backgroundColor: avatarColor || DEFAULT_AVATAR_COLOR }}
          >
            {initials}
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">
              {getFullName({ first_name: firstName, last_name: lastName })}
            </p>
            <p className="text-sm text-muted-foreground">@{username}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile details</CardTitle>
          <CardDescription>Edit your name, username, and avatar color.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first-name">First name</Label>
                <Input
                  id="first-name"
                  value={firstName}
                  onChange={(event) =>
                    setFirstName(
                      event.target.value
                        .replace(/[^A-Za-z]/g, "")
                        .slice(0, MAX_NAME_LENGTH)
                    )
                  }
                  onBlur={() => setFirstName(normalizeName(firstName))}
                  maxLength={MAX_NAME_LENGTH}
                  className="border-border bg-[hsl(var(--card))] focus-visible:border-primary focus-visible:ring-primary/30"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {firstName.length}/{MAX_NAME_LENGTH}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Last name</Label>
                <Input
                  id="last-name"
                  value={lastName}
                  onChange={(event) =>
                    setLastName(
                      event.target.value
                        .replace(/[^A-Za-z]/g, "")
                        .slice(0, MAX_NAME_LENGTH)
                    )
                  }
                  onBlur={() => setLastName(normalizeName(lastName))}
                  maxLength={MAX_NAME_LENGTH}
                  className="border-border bg-[hsl(var(--card))] focus-visible:border-primary focus-visible:ring-primary/30"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {lastName.length}/{MAX_NAME_LENGTH}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) =>
                  setUsername(
                    event.target.value
                      .replace(/[^A-Za-z0-9_-]/g, "")
                      .replace(/([-_])\1+/g, "$1")
                      .slice(0, MAX_USERNAME_LENGTH)
                  )
                }
                maxLength={MAX_USERNAME_LENGTH}
                className="border-border bg-[hsl(var(--card))] focus-visible:border-primary focus-visible:ring-primary/30"
                required
              />
              <p className="text-xs text-muted-foreground">
                {username.length}/{MAX_USERNAME_LENGTH}
              </p>
            </div>

            <div className="space-y-3">
              <Label>Avatar color</Label>
              <div className="flex flex-wrap gap-3">
                {COLOR_WHEEL.map((color) => {
                  const isActive = color === avatarColor;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAvatarColor(color)}
                      className={cn(
                        "h-10 w-10 rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isActive ? "border-primary" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                      aria-pressed={isActive}
                    />
                  );
                })}
              </div>
            </div>

            {error ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            {message ? (
              <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
                {message}
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={saving || !hasProfileChanges}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
