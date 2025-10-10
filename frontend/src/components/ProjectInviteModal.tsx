import { useState, useEffect, useMemo, KeyboardEvent } from "react";
import { useLazyQuery, useMutation } from "@apollo/client";
import {
  SEND_PROJECT_INVITE,
  GET_NOTIFICATIONS,
  SEARCH_USERS,
} from "../graphql";
import { useModal } from "./ModalStack";
import type { User } from "@shared/types";
import { getFullName, getInitials } from "../utils/user";
import { DEFAULT_AVATAR_COLOR } from "../constants/colors";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ScrollArea,
} from "./ui";
import { Loader2, X } from "lucide-react";
import { cn } from "../lib/utils";

interface ProjectInviteModalProps {
  projectId: string | null;
  onClose?: () => void;
}

type UserSuggestion = Pick<User, "id" | "first_name" | "last_name" | "username" | "avatar_color">;

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

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      closeModal("invite");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-md space-y-4">
        <DialogHeader>
          <DialogTitle>Invite members</DialogTitle>
          <DialogDescription>
            Search for teammates and send them an invite to join this project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-search">Search users</Label>
            <Input
              id="invite-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a username or name"
              autoFocus
            />
            <div className="space-y-1 text-xs text-muted-foreground">
              {searching ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching…
                </span>
              ) : null}
              {!searching && showSuggestions && query.trim().length >= 2 && suggestions.length === 0 ? (
                <span>No users found.</span>
              ) : null}
            </div>

            {!searching && showSuggestions && suggestions.length > 0 ? (
              <ScrollArea className="max-h-48 overflow-hidden rounded-md border border-border">
                <div className="divide-y divide-border bg-card">
                  {suggestions.map((user, idx) => {
                    const isActive = idx === activeIndex;
                    return (
                      <Button
                        key={user.id}
                        type="button"
                        variant="ghost"
                        onClick={() => toggleUser(user)}
                        className={cn(
                          "flex w-full items-center justify-start gap-3 rounded-none px-3 py-2 text-left text-sm",
                          isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                        )}
                      >
                        <Avatar className="h-8 w-8 border border-border/60">
                          <AvatarFallback
                            style={{ backgroundColor: user.avatar_color || DEFAULT_AVATAR_COLOR }}
                            className="text-sm font-semibold text-primary"
                          >
                            {getInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{getFullName(user)}</span>
                          <span className="text-xs text-muted-foreground">@{user.username}</span>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : null}
          </div>

          {selectedUsers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <Badge
                  key={user.id}
                  variant="secondary"
                  className="flex items-center gap-2 border border-border bg-muted px-2 py-1 text-xs"
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold uppercase text-primary"
                    style={{ backgroundColor: user.avatar_color || DEFAULT_AVATAR_COLOR }}
                  >
                    {getInitials(user)}
                  </span>
                  <span>{getFullName(user)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSelected(user.id)}
                    className="h-5 w-5 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </Badge>
              ))}
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-400">{success}</p> : null}

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => closeModal("invite")}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || selectedUsers.length === 0}>
              Send invites
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
