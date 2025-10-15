import { Check, ChevronDown, Loader2, Plus } from "lucide-react";
import type { KeyboardEvent } from "react";

import type { User } from "@shared/types";

import { DEFAULT_AVATAR_COLOR } from "../../constants/colors";
import { cn } from "../../lib/utils";
import { getFullName, getInitials } from "../../utils/user";
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from "../ui";
import type { ProjectMember } from "./types";

interface AssigneeDropdownProps {
  assignee: User | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (value: string) => Promise<void>;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  visibleMembers: ProjectMember[];
  isLoadingMembers: boolean;
  isShowingSearchResults: boolean;
  trimmedQuery: string;
  onSelectMember: (memberId: string) => void;
  onClearAssignee: () => void;
  isAssigningAssignee: boolean;
  onInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export function AssigneeDropdown({
  assignee,
  isOpen,
  onOpenChange,
  query,
  onQueryChange,
  inputRef,
  visibleMembers,
  isLoadingMembers,
  isShowingSearchResults,
  trimmedQuery,
  onSelectMember,
  onClearAssignee,
  isAssigningAssignee,
  onInputKeyDown,
}: AssigneeDropdownProps) {
  const assigneeFullName = assignee ? getFullName(assignee) : "";
  const assigneePrimaryLabel = assignee ? assigneeFullName || `@${assignee.username}` : "";
  const assigneeSecondaryLabel = assignee && assigneeFullName ? `@${assignee.username}` : null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isAssigningAssignee && !isOpen}
          className="inline-flex w-full min-w-[11rem] items-center justify-between gap-2 rounded-full border-border/70 bg-background/80 px-3 py-1.5 text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary"
          aria-busy={isAssigningAssignee}
        >
          <span className="flex min-w-0 items-center gap-2">
            {assignee ? (
              <>
                <span
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold uppercase text-primary"
                  style={{ backgroundColor: assignee.avatar_color || DEFAULT_AVATAR_COLOR }}
                >
                  {getInitials(assignee)}
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-xs font-semibold text-foreground">{assigneePrimaryLabel}</span>
                  {assigneeSecondaryLabel ? (
                    <span className="text-[10px] text-muted-foreground">{assigneeSecondaryLabel}</span>
                  ) : null}
                </span>
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Assign member</span>
              </>
            )}
          </span>
          {isAssigningAssignee || isLoadingMembers ? (
            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-72 p-0"
        loop
        onCloseAutoFocus={(event) => {
          event.preventDefault();
        }}
      >
        <div className="border-b border-border/60 px-3 py-2">
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              void onQueryChange(event.target.value);
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
              onInputKeyDown(event);
            }}
            placeholder="Search by name or username"
            className="h-9 text-sm"
            aria-label="Search teammates"
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {isLoadingMembers ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              {isShowingSearchResults ? "Searching teammates…" : "Loading teammates…"}
            </p>
          ) : visibleMembers.length > 0 ? (
            visibleMembers.map((member) => {
              const isSelected = assignee?.id === member.id;
              const fullName = getFullName(member);
              const primaryLabel = fullName || `@${member.username}`;
              const secondaryLabel = fullName ? `@${member.username}` : null;
              return (
                <DropdownMenuItem
                  key={member.id}
                  onSelect={(event) => {
                    if (isAssigningAssignee || isSelected) {
                      event.preventDefault();
                      return;
                    }
                    onSelectMember(member.id);
                  }}
                  className={cn(
                    "items-center justify-between gap-2 px-3 py-2",
                    isSelected && "bg-primary/10 text-primary focus:bg-primary/10 focus:text-primary"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-border/60">
                      <AvatarFallback
                        className="text-sm font-semibold uppercase text-primary"
                        style={{ backgroundColor: member.avatar_color || DEFAULT_AVATAR_COLOR }}
                      >
                        {getInitials(member)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex flex-col leading-tight">
                      <span className="text-sm font-medium text-foreground">{primaryLabel}</span>
                      {secondaryLabel ? (
                        <span className="text-xs text-muted-foreground">{secondaryLabel}</span>
                      ) : null}
                    </span>
                  </span>
                  {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
                </DropdownMenuItem>
              );
            })
          ) : (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              {isShowingSearchResults
                ? `No matches for "${trimmedQuery}".`
                : "No teammates listed yet. Try searching above."}
            </p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            if (!assignee || isAssigningAssignee) {
              event.preventDefault();
              return;
            }
            onClearAssignee();
          }}
          disabled={!assignee || isAssigningAssignee}
          className="px-3 py-2 text-xs text-destructive focus:text-destructive"
        >
          Unassign
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
