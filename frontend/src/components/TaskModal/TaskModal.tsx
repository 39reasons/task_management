import { Fragment } from "react";
import type { Task, AuthUser } from "@shared/types";
import { Sparkles, X } from "lucide-react";

import { DueDateModal } from "../DueDateModal";
import { Button, Dialog, DialogContent, DialogTitle, ScrollArea, Separator } from "../ui";
import { TaskCommentsPanel } from "./TaskCommentsPanel";
import { TaskDescriptionSection } from "./TaskDescriptionSection";
import { TaskMetaSection } from "./TaskMetaSection";
import { TaskTitleEditor } from "./TaskTitleEditor";
import {
  TASK_TITLE_MAX_LENGTH,
  useTaskModalController,
} from "./useTaskModalController";

interface TaskModalProps {
  task: Task | null;
  currentUser: AuthUser | null;
  onTaskUpdate?: (task: Task) => void;
}

export function TaskModal({ task, currentUser, onTaskUpdate }: TaskModalProps) {
  const controller = useTaskModalController({ task, currentUser, onTaskUpdate });
  const { dialog } = controller;

  if (!dialog.isOpen || !controller.task) {
    return null;
  }

  const {
    title,
    description,
    draft,
    meta,
    tags,
    assignee,
    comments,
    dueDateModal,
    currentUserId,
  } = controller;

  return (
    <Fragment>
      <Dialog open={dialog.isOpen} onOpenChange={dialog.handleDialogOpenChange}>
        <DialogContent
          className="task-modal-theme max-w-[1100px] overflow-hidden border border-border bg-[hsl(var(--modal-background))] p-0 text-[hsl(var(--modal-foreground))] shadow-2xl"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogTitle className="sr-only">Task details</DialogTitle>
          <div className="flex h-[80vh] min-h-[560px] flex-col bg-[hsl(var(--background))]">
            <div className="flex items-center justify-between gap-4 border-b border-border/60 bg-[hsl(var(--background))] px-6 py-3">
              <p className="text-sm font-semibold text-muted-foreground">Task details</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => void dialog.handleClose()}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid flex-1 gap-0 bg-[hsl(var(--background))] md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <ScrollArea className="h-full min-h-0 border-b border-border/60 bg-[hsl(var(--background))] md:border-b-0 md:border-r">
                <div className="flex flex-col gap-4 px-6 py-5">
                  <TaskTitleEditor
                    title={title.value}
                    isEditing={title.isEditing}
                    canCommit={title.canCommit}
                    maxLength={TASK_TITLE_MAX_LENGTH}
                    onStartEdit={title.startEdit}
                    onChange={title.change}
                    onCommit={() => void title.commit()}
                    onCancel={title.cancel}
                  />

                  <TaskMetaSection
                    status={meta.status}
                    onStatusChange={(nextStatus) => {
                      void meta.handleStatusChange(nextStatus);
                    }}
                    isStatusUpdating={meta.isStatusUpdating}
                    statusError={meta.statusError}
                    hasTags={tags.hasTags}
                    tags={tags.tags}
                    assignee={assignee.assignee ?? null}
                    dueDate={meta.dueDate}
                    onAddTag={tags.openTagModal}
                    onAddDueDate={dueDateModal.openDueDateModal}
                    onRemoveTag={(tagId) => {
                      void tags.removeTag(tagId);
                    }}
                    onAssignMember={(memberId) => assignee.handleAssignMember(memberId)}
                    onClearAssignee={assignee.clearAssignee}
                    onClearDueDate={() => {
                      void meta.clearDueDate();
                    }}
                    isAssigningAssignee={assignee.isAssigning}
                    isMembersLoading={assignee.isMembersLoading}
                    onSearchMembers={assignee.handleSearchMembers}
                    isSearchingMembers={assignee.isSearchingMembers}
                    members={assignee.projectMembers}
                  />

                  <Separator />

                  <TaskDescriptionSection
                    description={description.value}
                    initialDescription={description.initialValue}
                    isEditing={description.isEditing}
                    onChange={description.change}
                    onStartEdit={description.startEdit}
                    onSave={() => void description.save()}
                    onCancel={description.cancel}
                    isDraftPromptVisible={draft.isPromptVisible}
                    draftPrompt={draft.prompt}
                    draftError={draft.error}
                    isGeneratingDraft={draft.isGenerating}
                    onToggleDraftPrompt={draft.togglePrompt}
                    onDraftPromptChange={draft.changePrompt}
                    onGenerateDraft={() => void draft.generateDraft()}
                    onCancelDraftPrompt={draft.cancelPrompt}
                    isExpanded={description.isExpanded}
                    onToggleExpand={description.toggleExpanded}
                  />

                  {draft.suggestions.length > 0 ? (
                    <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                        <Sparkles className="h-4 w-4" />
                        <span>AI suggested subtasks</span>
                      </div>
                      <ul className="list-outside space-y-1 pl-4 text-muted-foreground">
                        {draft.suggestions.map((suggestion) => (
                          <li key={suggestion} className="list-disc">
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-muted-foreground/80">
                        Add the ones you like as separate tasks or checklist items.
                      </p>
                    </div>
                  ) : null}
                </div>
              </ScrollArea>

              <ScrollArea className="h-full min-h-0 bg-[hsl(var(--background))]">
                <div className="flex h-full flex-col px-6 py-5">
                  <TaskCommentsPanel
                    comments={comments.comments}
                    loading={comments.loading}
                    commentText={comments.commentText}
                    onCommentTextChange={comments.changeCommentText}
                    onSubmitComment={() => comments.submitComment()}
                    editingCommentId={comments.editingCommentId}
                    editingCommentText={comments.editingCommentText}
                    onEditCommentTextChange={comments.changeEditingCommentText}
                    onStartEditComment={comments.startEditComment}
                    onCancelEditComment={comments.cancelEditComment}
                    onSubmitEditComment={() => comments.submitCommentEdit()}
                    onDeleteComment={comments.deleteComment}
                    currentUserId={currentUserId}
                  />
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <DueDateModal task={controller.task} currentDueDate={meta.dueDate} onSave={meta.handleDueDateSave} />
    </Fragment>
  );
}
