import { Plus, Clock, Calendar, X } from "lucide-react";
import type { AuthUser } from "@shared/types";
import { getFullName, getInitials } from "../../utils/user";
import { DEFAULT_AVATAR_COLOR } from "../../constants/colors";

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
          <button
            type="button"
            onClick={onAddTag}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-600 bg-gray-900 text-sm text-white hover:border-gray-400"
          >
            <Plus size={14} />
            Tags
          </button>
        )}
        {!hasAssignees && (
          <button
            type="button"
            onClick={onAddMember}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-600 bg-gray-900 text-sm text-white hover:border-gray-400"
          >
            <Plus size={14} />
            Members
          </button>
        )}
        {!dueDate && (
          <button
            type="button"
            onClick={onAddDueDate}
            className="flex items-center gap-1 rounded-md border border-gray-600 bg-gray-900 px-3 py-1.5 text-sm text-white hover:border-gray-400"
          >
            <Clock size={14} />
            Due date
          </button>
        )}
      </div>

      {hasTags && (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-400">Tags</p>
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 rounded-full bg-gray-700/80 px-3 py-1.5 text-xs text-white"
                style={{ backgroundColor: tag.color ?? undefined }}
              >
                <span className="font-semibold uppercase tracking-wide">
                  {tag.name}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveTag(tag.id)}
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/50 text-white/80 transition hover:border-red-300 hover:text-red-100"
                  aria-label={`Remove ${tag.name}`}
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={onAddTag}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-gray-500 text-gray-200 transition hover:border-blue-400 hover:text-blue-200"
              aria-label="Add tag"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      )}

      {hasAssignees && (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-400">Assignees</p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-white">
            {assignees.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 rounded-full bg-gray-700/70 px-3 py-1.5 text-xs text-white"
              >
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold uppercase text-white"
                  style={{ backgroundColor: member.avatar_color || DEFAULT_AVATAR_COLOR }}
                >
                  {getInitials(member)}
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="font-semibold">{getFullName(member)}</span>
                  <span className="text-[10px] text-gray-300">@{member.username}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveMember(member.id)}
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full border border-gray-500 text-gray-300 transition hover:border-red-400 hover:text-red-300"
                  aria-label={`Remove ${getFullName(member)}`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={onAddMember}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-gray-500 text-gray-200 transition hover:border-blue-400 hover:text-blue-200"
              aria-label="Add member"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      )}

      {dueDate ? (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-400">Due Date</p>
          <div className="relative inline-flex items-center rounded-full border border-gray-600/70 bg-gray-800/70 pr-6 text-xs text-white">
            <button
              type="button"
              onClick={onAddDueDate}
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-left text-white transition hover:bg-gray-700/70"
            >
              <Calendar size={14} className="text-gray-300" />
              <span>{dueDate}</span>
            </button>
            <button
              type="button"
              onClick={onClearDueDate}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-gray-500 bg-gray-900 text-gray-300 transition hover:border-red-400 hover:text-red-200"
              aria-label="Remove due date"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
