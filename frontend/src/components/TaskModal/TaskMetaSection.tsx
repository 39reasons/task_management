import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Plus, Clock, Calendar, X, ChevronDown, Check, Loader2 } from "lucide-react";
import type { Task, User } from "@shared/types";
import { getFullName, getInitials } from "../../utils/user";
import { DEFAULT_AVATAR_COLOR } from "../../constants/colors";
import { cn } from "../../lib/utils";
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

type ProjectMember = Pick<User, "id" | "first_name" | "last_name" | "username" | "avatar_color">;

interface TaskMetaSectionProps {
  status: Task["status"];
  onStatusChange: (status: Task["status"]) => void;
  isStatusUpdating: boolean;
  statusError?: string | null;
  hasTags: boolean;
  tags: { id: string; name: string; color: string | null }[];
  assignee: User | null;
  dueDate: string;
  onAddTag: () => void;
  onAddDueDate: () => void;
  onRemoveTag: (id: string) => void;
  onAssignMember: (memberId: string) => Promise<void> | void;
  onClearAssignee: () => void;
  onClearDueDate: () => void;
  isAssigningAssignee: boolean;
  isMembersLoading: boolean;
  onSearchMembers: (query: string) => Promise<ProjectMember[]>;
  isSearchingMembers: boolean;
  members: ProjectMember[];
}

export function TaskMetaSection({
  status,
  onStatusChange,
  isStatusUpdating,
  statusError,
  hasTags,
  tags,
  assignee,
  dueDate,
  onAddTag,
  onAddDueDate,
  onRemoveTag,
  onAssignMember,
  onClearAssignee,
  onClearDueDate,
  isAssigningAssignee,
  isMembersLoading,
  onSearchMembers,
  isSearchingMembers,
  members,
}: TaskMetaSectionProps) {
  const STATUS_OPTIONS: Array<{ value: Task["status"]; label: string; dotClass: string }> = [
    { value: "new", label: "New", dotClass: "bg-muted-foreground/50" },
    { value: "active", label: "Active", dotClass: "bg-blue-500" },
    { value: "closed", label: "Closed", dotClass: "bg-emerald-500" },
  ];

  const currentStatus = STATUS_OPTIONS.find((option) => option.value === status) ?? STATUS_OPTIONS[0];

  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [isAssigneeMenuOpen, setIsAssigneeMenuOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<ProjectMember[]>([]);
  const assigneeSearchRef = useRef<HTMLInputElement | null>(null);
  const latestSearchToken = useRef(0);

  const normalizedQuery = assigneeQuery.trim().toLowerCase();

  const baseMembers = useMemo(() => {
    if (!assignee) {
      return members;
    }
    const exists = members.some((member) => member.id === assignee.id);
    if (exists) {
      return members;
    }
    return [
      {
        id: assignee.id,
        first_name: assignee.first_name,
        last_name: assignee.last_name,
        username: assignee.username,
        avatar_color: assignee.avatar_color ?? null,
      },
      ...members,
    ];
  }, [assignee, members]);

  useEffect(() => {
    setAssigneeQuery("");
    setSearchResults([]);
    latestSearchToken.current += 1;
  }, [assignee?.id]);

  useEffect(() => {
    if (!isAssigneeMenuOpen) {
      setAssigneeQuery("");
      setSearchResults([]);
      latestSearchToken.current += 1;
      return;
    }

    const frame = requestAnimationFrame(() => {
      assigneeSearchRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isAssigneeMenuOpen]);

  const handleAssigneeQueryChange = useCallback(
    async (value: string) => {
      setAssigneeQuery(value);
      const token = ++latestSearchToken.current;
      const trimmed = value.trim();

      if (!trimmed) {
        setSearchResults([]);
        return;
      }

      try {
        const results = await onSearchMembers(trimmed);
        if (latestSearchToken.current === token) {
          setSearchResults(results);
        }
      } catch (error) {
        if (latestSearchToken.current === token) {
          setSearchResults([]);
        }
        console.error("Failed to search assignees", error);
      }
    },
    [onSearchMembers]
  );

  const isShowingSearchResults = normalizedQuery.length > 0;
  const visibleMembers = isShowingSearchResults ? searchResults : baseMembers;
  const isLoadingVisibleMembers = isShowingSearchResults ? isSearchingMembers : isMembersLoading;

  const handleSelectMember = (memberId: string) => {
    if (isAssigningAssignee || assignee?.id === memberId) {
      return;
    }
    void onAssignMember(memberId);
  };

  const handleAssigneeSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (isLoadingVisibleMembers || visibleMembers.length === 0) {
        return;
      }
      const first = visibleMembers[0];
      handleSelectMember(first.id);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsAssigneeMenuOpen(false);
    }
  };

  const assigneeFullName = assignee ? getFullName(assignee) : "";
  const assigneePrimaryLabel = assignee ? assigneeFullName || `@${assignee.username}` : "";
  const assigneeSecondaryLabel = assignee && assigneeFullName ? `@${assignee.username}` : null;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isStatusUpdating}
              className="inline-flex min-w-[9rem] items-center justify-between gap-2 rounded-full border-border/70 bg-background/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground hover:border-primary/40 hover:text-primary"
              aria-busy={isStatusUpdating}
            >
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${currentStatus.dotClass}`} />
                {currentStatus.label}
              </span>
              {isStatusUpdating ? (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            {STATUS_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onSelect={(event) => {
                  event.preventDefault();
                  if (isStatusUpdating || option.value === status) return;
                  onStatusChange(option.value);
                }}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span className={`h-2 w-2 rounded-full ${option.dotClass}`} />
                  {option.label}
                </span>
                {option.value === status ? <Check className="h-3.5 w-3.5 text-foreground" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {statusError ? <p className="text-xs text-destructive">{statusError}</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!hasTags && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onAddTag}
            className="gap-1 border-dashed border-border/60 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Tags
          </Button>
        )}
        {!dueDate && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onAddDueDate}
            className="gap-1 border-dashed border-border/60 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary"
          >
            <Clock className="h-3.5 w-3.5" />
            Due date
          </Button>
        )}
      </div>

      {hasTags && (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Tags</p>
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 rounded-full border border-transparent px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground shadow-sm"
                style={{ backgroundColor: tag.color ?? undefined }}
              >
                <span>{tag.name}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => onRemoveTag(tag.id)}
                  className="h-5 w-5 rounded-full border border-white/30 bg-[hsl(var(--card))] text-primary-foreground hover:border-primary/40 hover:bg-primary/10"
                  aria-label={`Remove ${tag.name}`}
                >
                  <X size={12} strokeWidth={2} />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onAddTag}
              className="h-6 w-6 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
              aria-label="Add tag"
            >
              <Plus size={12} />
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Assignee</p>
        <DropdownMenu open={isAssigneeMenuOpen} onOpenChange={setIsAssigneeMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isAssigningAssignee && !isAssigneeMenuOpen}
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
                      <span className="truncate text-xs font-semibold text-foreground">
                        {assigneePrimaryLabel}
                      </span>
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
              {isAssigningAssignee || isLoadingVisibleMembers ? (
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
                ref={assigneeSearchRef}
                value={assigneeQuery}
                onChange={(event) => {
                  void handleAssigneeQueryChange(event.target.value);
                }}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  handleAssigneeSearchKeyDown(event);
                }}
                placeholder="Search by name or username"
                className="h-9 text-sm"
                aria-label="Search teammates"
              />
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {isLoadingVisibleMembers ? (
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
                        handleSelectMember(member.id);
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
                    ? `No matches for "${assigneeQuery.trim()}".`
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
      </div>

      {dueDate ? (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Due Date</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onAddDueDate}
              className="gap-2 border-border/60 text-sm text-foreground hover:border-primary/40 hover:text-primary"
            >
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{dueDate}</span>
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onClearDueDate}
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive"
              aria-label="Remove due date"
            >
              <X size={14} />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
