import { Calendar, Clock, Plus, X } from "lucide-react";
import type { Task, User } from "@shared/types";

import { Button } from "../ui";
import type { ProjectMember } from "./types";
import { AssigneeDropdown } from "./AssigneeDropdown";
import { TaskTagsAddButton, TaskTagsList } from "./TaskTagsList";
import { useAssigneePicker } from "./useAssigneePicker";
import { TaskStatusDropdown } from "../tasks/TaskStatusDropdown";

interface TaskMetaSectionProps {
  status: Task["status"];
  onStatusChange: (status: Task["status"]) => void;
  isStatusUpdating: boolean;
  statusError?: string | null;
  tags: { id: string; name: string; color: string | null }[];
  availableTags: { id: string; name: string; color: string | null }[];
  loadingTags: boolean;
  assignee: User | null;
  dueDate: string;
  onAddDueDate: () => void;
  onRemoveTag: (id: string) => void;
  onAddExistingTag: (id: string) => void;
  onCreateTag: (input: { name: string; color: string }) => Promise<void>;
  onUpdateTag: (input: { id: string; name: string; color: string | null }) => Promise<void>;
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
  tags,
  assignee,
  dueDate,
  availableTags,
  loadingTags,
  onAddDueDate,
  onRemoveTag,
  onAddExistingTag,
  onCreateTag,
  onUpdateTag,
  onAssignMember,
  onClearAssignee,
  onClearDueDate,
  isAssigningAssignee,
  isMembersLoading,
  onSearchMembers,
  isSearchingMembers,
  members,
}: TaskMetaSectionProps) {
  const hasTags = tags.length > 0;

  const {
    isOpen: isAssigneeMenuOpen,
    setIsOpen: setIsAssigneeMenuOpen,
    query: assigneeQuery,
    trimmedQuery,
    handleQueryChange,
    inputRef: assigneeSearchRef,
    visibleMembers,
    isLoadingVisibleMembers,
    isShowingSearchResults,
    handleInputKeyDown,
    handleSelectMember,
  } = useAssigneePicker({
    assignee,
    members,
    onSearchMembers,
    isMembersLoading,
    isSearchingMembers,
    onAssignMember,
    isAssigningAssignee,
  });

  const renderInlineAddTagButton = () => (
    <TaskTagsAddButton
      tags={tags}
      availableTags={availableTags}
      loadingAvailableTags={loadingTags}
      onAddTag={onAddExistingTag}
      onCreateTag={onCreateTag}
      trigger={
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1 border-dashed border-border/60 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary"
          aria-label="Add tag"
        >
          <Plus className="h-3.5 w-3.5" />
          Add tag
        </Button>
      }
    />
  );

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
        <TaskStatusDropdown value={status ?? null} onChange={onStatusChange} isUpdating={isStatusUpdating} />
        {statusError ? <p className="text-xs text-destructive">{statusError}</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!dueDate ? (
          <>
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
            {!hasTags ? renderInlineAddTagButton() : null}
          </>
        ) : null}
      </div>

      {hasTags ? (
        <TaskTagsList
          tags={tags}
          availableTags={availableTags}
          loadingAvailableTags={loadingTags}
          onRemoveTag={onRemoveTag}
          onAddTag={onAddExistingTag}
          onCreateTag={onCreateTag}
          onUpdateTag={onUpdateTag}
        />
      ) : null}

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Assignee</p>
        <AssigneeDropdown
          assignee={assignee}
          isOpen={isAssigneeMenuOpen}
          onOpenChange={setIsAssigneeMenuOpen}
          query={assigneeQuery}
          onQueryChange={handleQueryChange}
          inputRef={assigneeSearchRef}
          visibleMembers={visibleMembers}
          isLoadingMembers={isLoadingVisibleMembers}
          isShowingSearchResults={isShowingSearchResults}
          trimmedQuery={trimmedQuery}
          onSelectMember={handleSelectMember}
          onClearAssignee={onClearAssignee}
          isAssigningAssignee={isAssigningAssignee}
          onInputKeyDown={handleInputKeyDown}
        />
      </div>

      {dueDate ? (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Due Date</p>
          <div className="flex flex-wrap items-center gap-2">
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
            {!hasTags ? renderInlineAddTagButton() : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
