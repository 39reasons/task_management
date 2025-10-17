import { Fragment } from "react";
import type { Task, AuthUser } from "@shared/types";
import { Sparkles, X } from "lucide-react";

import { DueDateModal } from "./DueDateModal";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  ScrollArea,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui";
import { TaskCommentsPanel } from "./TaskCommentsPanel";
import { TaskDescriptionSection } from "./TaskDescriptionSection";
import { TaskMetaSection } from "./TaskMetaSection";
import { TaskTitleEditor } from "./TaskTitleEditor";
import {
  TASK_TITLE_MAX_LENGTH,
  useTaskModalController,
} from "./useTaskModalController";
import { TaskHistoryPanel } from "./TaskHistoryPanel";

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
    history,
    save,
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
          <div className="flex h-[80vh] min-h-[560px] max-h-[90vh] flex-col overflow-hidden bg-[hsl(var(--background))]">
            <div className="flex items-center justify-between gap-4 border-b border-border/60 bg-[hsl(var(--background))] px-6 py-3">
              <p className="text-sm font-semibold text-muted-foreground">Task details</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-full border border-border/60 bg-[hsl(var(--card))] px-3 py-1.5 shadow-sm">
                  {save.hasUnsavedChanges ? (
                    <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                      Unsaved changes
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">All changes saved</span>
                  )}
                  <div className="h-4 w-px bg-border/50" />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={save.discard}
                    disabled={!save.hasUnsavedChanges || save.isSaving}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Discard
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void save.save()}
                    disabled={!save.hasUnsavedChanges || save.isSaving}
                    className="px-4"
                  >
                    {save.isSaving ? "Saving…" : "Save"}
                  </Button>
                </div>
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
            </div>

            <div className="grid flex-1 gap-0 overflow-hidden bg-[hsl(var(--background))] md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <ScrollArea className="h-full min-h-0 border-b border-border/60 bg-[hsl(var(--background))] md:border-b-0 md:border-r">
                <div className="flex flex-col gap-4 px-6 py-5 pb-24">
                  <TaskTitleEditor
                    title={title.value}
                    isEditing={title.isEditing}
                    canCommit={title.canCommit}
                    maxLength={TASK_TITLE_MAX_LENGTH}
                    onStartEdit={title.startEdit}
                    onChange={title.change}
                    onCommit={title.commit}
                    onCancel={title.cancel}
                  />

                  <TaskMetaSection
                    status={meta.status}
                    onStatusChange={meta.handleStatusChange}
                    isStatusUpdating={meta.isStatusUpdating}
                    statusError={meta.statusError}
                    tags={tags.tags}
                    availableTags={tags.availableTags}
                    loadingTags={tags.loadingAvailableTags}
                    assignee={assignee.assignee ?? null}
                    dueDate={meta.dueDate}
                    onAddDueDate={dueDateModal.openDueDateModal}
                    onRemoveTag={tags.removeTag}
                    onAddExistingTag={tags.addExistingTag}
                    onCreateTag={tags.createTag}
                    onAssignMember={assignee.handleAssignMember}
                    onClearAssignee={assignee.clearAssignee}
                    onClearDueDate={meta.clearDueDate}
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
                    onSave={description.save}
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

              <div className="flex h-full min-h-0 flex-col bg-[hsl(var(--background))]">
                <Tabs defaultValue="comments" className="flex h-full min-h-0 flex-col">
                  <div className="px-6 pt-5">
                    <TabsList className="grid h-10 w-full grid-cols-2 rounded-full bg-muted/60 p-1">
                      <TabsTrigger
                        value="comments"
                        className="group/trigger rounded-full text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-[hsl(var(--modal-foreground-bright))] data-[state=active]:bg-background data-[state=active]:shadow"
                      >
                        Comments
                      </TabsTrigger>
                      <TabsTrigger
                        value="history"
                        className="group/trigger rounded-full text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-[hsl(var(--modal-foreground-bright))] data-[state=active]:bg-background data-[state=active]:shadow"
                      >
                        History
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <div className="flex-1 min-h-0">
                    <TabsContent value="comments" className="mt-0 h-full min-h-0">
                      <ScrollArea className="h-full min-h-0 px-6 py-5">
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
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="history" className="mt-0 h-full min-h-0">
                      <ScrollArea className="h-full min-h-0 px-6 py-5">
                        <TaskHistoryPanel
                          events={history.events}
                          loading={history.loading}
                          error={history.error}
                        />
                      </ScrollArea>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <DueDateModal task={controller.task} currentDueDate={meta.dueDate} onSave={meta.handleDueDateSave} />
    </Fragment>
  );
}
