import { useCallback, useEffect, useState, KeyboardEvent } from "react";
import { Loader2 } from "lucide-react";

import { DEFAULT_AVATAR_COLOR } from "../constants/colors";
import { useInviteSearch } from "../hooks/useInviteSearch";
import { useInviteUsers } from "../hooks/useInviteUsers";
import { cn } from "../lib/utils";
import type { InviteeSuggestion } from "../types/invitations";
import { getFullName, getInitials } from "../utils/user";
import { useModal } from "./ModalStack";
import { SelectedInviteeChips } from "./SelectedInviteeChips";
import {
  Avatar,
  AvatarFallback,
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

interface ProjectInviteModalProps {
  projectId: string | null;
  onClose?: () => void;
}

export function ProjectInviteModal({ projectId, onClose }: ProjectInviteModalProps) {
  const { modals, closeModal } = useModal();
  const isOpen = modals.includes("invite");

  const [selectedUsers, setSelectedUsers] = useState<InviteeSuggestion[]>([]);

  const {
    query,
    setQuery,
    suggestions,
    searching,
    showSuggestions,
    activeIndex,
    handleKeyNavigation,
    resetSearch,
  } = useInviteSearch({ isOpen, selectedUsers });

  const { inviteUsers, loading, error, success, clearStatus } = useInviteUsers();

  useEffect(() => {
    if (!isOpen) {
      setSelectedUsers([]);
      resetSearch();
      clearStatus();
      onClose?.();
    }
  }, [isOpen, onClose, resetSearch, clearStatus]);

  const toggleUser = useCallback(
    (user: InviteeSuggestion) => {
      setSelectedUsers((prev) => {
        if (prev.some((existing) => existing.id === user.id)) {
          return prev.filter((existing) => existing.id !== user.id);
        }
        return [...prev, user];
      });
      resetSearch();
      clearStatus();
    },
    [clearStatus, resetSearch]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!projectId) {
      return;
    }

    const wasSuccessful = await inviteUsers(projectId, selectedUsers);
    if (wasSuccessful) {
      setSelectedUsers([]);
      resetSearch();
      setTimeout(() => {
        closeModal("invite");
      }, 800);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const selected = handleKeyNavigation(event);
    if (selected) {
      toggleUser(selected);
    }
  };

  const removeSelected = useCallback(
    (id: string) => {
      setSelectedUsers((prev) => prev.filter((user) => user.id !== id));
      clearStatus();
    },
    [clearStatus]
  );

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      closeModal("invite");
    }
  };

  if (!projectId) {
    return null;
  }

  if (!isOpen) {
    return null;
  }

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
              onChange={(event) => {
                setQuery(event.target.value);
                clearStatus();
              }}
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

          <SelectedInviteeChips users={selectedUsers} onRemove={removeSelected} />

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-400">{success}</p> : null}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => closeModal("invite")}
              className="border border-border/70 text-muted-foreground hover:border-border hover:bg-muted"
            >
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
