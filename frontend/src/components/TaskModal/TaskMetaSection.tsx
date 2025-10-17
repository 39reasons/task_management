import { Calendar, Check, ChevronDown, Clock, Loader2, X } from "lucide-react";
import type { Task, User } from "@shared/types";

import { TASK_STATUS_OPTIONS, DEFAULT_TASK_STATUS } from "../../constants/taskStatus";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui";
import type { ProjectMember } from "./types";
import { AssigneeDropdown } from "./AssigneeDropdown";
import { TaskTagsList } from "./TaskTagsList";
import { useAssigneePicker } from "./useAssigneePicker";

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
  onAssignMember,
  onClearAssignee,
  onClearDueDate,
  isAssigningAssignee,
  isMembersLoading,
  onSearchMembers,
  isSearchingMembers,
  members,
}: TaskMetaSectionProps) {
  const currentStatus =
    TASK_STATUS_OPTIONS.find((option) => option.value === status) ?? DEFAULT_TASK_STATUS;

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
            {TASK_STATUS_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onSelect={() => {
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

      <TaskTagsList
        tags={tags}
        availableTags={availableTags}
        loadingAvailableTags={loadingTags}
        onRemoveTag={onRemoveTag}
        onAddTag={onAddExistingTag}
        onCreateTag={onCreateTag}
      />

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
