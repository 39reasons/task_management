import { Plus, Clock, Calendar, X } from "lucide-react";
import type { AuthUser } from "@shared/types";
import { getFullName, getInitials } from "../../utils/user";
import { DEFAULT_AVATAR_COLOR } from "../../constants/colors";
import { Button } from "../ui";

interface TaskMetaSectionProps {
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
  return (
    <div className="space-y-3">
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
