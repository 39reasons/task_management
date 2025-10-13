import { Plus, Clock, Calendar, X, ChevronDown, Check, Loader2 } from "lucide-react";
import type { AuthUser, Task } from "@shared/types";
import { getFullName, getInitials } from "../../utils/user";
import { DEFAULT_AVATAR_COLOR } from "../../constants/colors";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui";

interface TaskMetaSectionProps {
  status: Task["status"];
  onStatusChange: (status: Task["status"]) => void;
  isStatusUpdating: boolean;
  statusError?: string | null;
  hasTags: boolean;
  hasAssignees: boolean;
  tags: { id: string; name: string; color: string | null }[];
  assignees: AuthUser[];
  dueDate: string;
  onAddTag: () => void;
  onAddMember: () => void;
  onAddDueDate: () => void;
  onRemoveTag: (id: string) => void;
  onRemoveMember: (id: string) => void;
  onClearDueDate: () => void;
}

export function TaskMetaSection({
  status,
  onStatusChange,
  isStatusUpdating,
  statusError,
  hasTags,
  hasAssignees,
  tags,
  assignees,
  dueDate,
  onAddTag,
  onAddMember,
  onAddDueDate,
  onRemoveTag,
  onRemoveMember,
  onClearDueDate,
}: TaskMetaSectionProps) {
  const STATUS_OPTIONS: Array<{ value: Task["status"]; label: string; dotClass: string }> = [
    { value: "new", label: "New", dotClass: "bg-muted-foreground/50" },
    { value: "active", label: "Active", dotClass: "bg-blue-500" },
    { value: "closed", label: "Closed", dotClass: "bg-emerald-500" },
  ];

  const currentStatus = STATUS_OPTIONS.find((option) => option.value === status) ?? STATUS_OPTIONS[0];

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
        {!hasAssignees && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onAddMember}
            className="gap-1 border-dashed border-border/60 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Members
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

      {hasAssignees && (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Assignees</p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
            {assignees.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 rounded-full border border-border bg-[hsl(var(--card))] px-3 py-1.5 text-xs text-foreground"
              >
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold uppercase text-primary"
                  style={{ backgroundColor: member.avatar_color || DEFAULT_AVATAR_COLOR }}
                >
                  {getInitials(member)}
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="font-semibold text-foreground">{getFullName(member)}</span>
                  <span className="text-[10px] text-muted-foreground">@{member.username}</span>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => onRemoveMember(member.id)}
                  className="ml-1 h-5 w-5 rounded-full border border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                  aria-label={`Remove ${getFullName(member)}`}
                >
                  <X size={12} />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onAddMember}
              className="h-6 w-6 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
              aria-label="Add member"
            >
              <Plus size={12} />
            </Button>
          </div>
        </div>
      )}

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
