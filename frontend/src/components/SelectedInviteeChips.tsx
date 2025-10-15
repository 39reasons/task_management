import { X } from "lucide-react";

import { DEFAULT_AVATAR_COLOR } from "../constants/colors";
import { getFullName, getInitials } from "../utils/user";
import type { InviteeSuggestion } from "../types/invitations";
import { Badge, Button } from "./ui";

interface SelectedInviteeChipsProps {
  users: InviteeSuggestion[];
  onRemove: (id: string) => void;
}

export function SelectedInviteeChips({ users, onRemove }: SelectedInviteeChipsProps) {
  if (users.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {users.map((user) => (
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
            onClick={() => onRemove(user.id)}
            className="h-5 w-5 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </Badge>
      ))}
    </div>
  );
}
