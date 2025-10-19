import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, CalendarDays, Loader2, Save } from "lucide-react";
import type { AuthUser, TaskStatus, WorkItem, WorkItemType } from "@shared/types";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Input,
  Textarea,
} from "../components/ui";
import { TaskStatusDropdown } from "../components/tasks/TaskStatusDropdown";
import { GET_WORK_ITEM, UPDATE_WORK_ITEM } from "../graphql";
import { getWorkItemTypeLabel, WORK_ITEM_TYPE_LABELS } from "../constants/workItems";

type WorkItemQueryResult = {
  workItem: WorkItem | null;
};

const STATUS_META: Record<
  string,
  {
    label: string;
    badgeClass: string;
  }
> = {
  new: {
    label: "New",
    badgeClass: "bg-[#3a3a3a] text-white dark:bg-white/20 dark:text-white",
  },
  active: {
    label: "Active",
    badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  closed: {
    label: "Closed",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
};

function getPriorityLabel(priority?: string | null): string {
  if (!priority) return "None";
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatDate(value?: string | null): string {
  if (!value) return "Not set";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "Not set";
  }
}

function formatRelativeTimeFromNow(timestamp?: string | null): string {
  if (!timestamp) return "just now";
  const parsed = new Date(timestamp);
  const now = Date.now();
  if (Number.isNaN(parsed.getTime())) {
    return "just now";
  }
  const diffSeconds = Math.max(0, Math.floor((now - parsed.getTime()) / 1000));
  if (diffSeconds < 5) return "just now";
  if (diffSeconds < 60) {
    const seconds = diffSeconds;
    return `${seconds} second${seconds === 1 ? "" : "s"} ago`;
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) {
    return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
  }
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  }
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
}

function WorkItemDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-12 w-1/2" />
      <Skeleton className="h-5 w-40" />
      <Card>
        <CardHeader className="space-y-4">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-1/4" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/5" />
        </CardContent>
      </Card>
    </div>
  );
}

function resolveWorkItemLink(projectId: string, itemId: string, type: WorkItemType): string {
  if (type === "TASK" || type === "BUG") {
    return `/projects/${projectId}/tasks/${itemId}`;
  }
  return `/projects/${projectId}/work-items/${itemId}`;
}

export function WorkItemDetailsPage({ user: _user }: { user: AuthUser | null }) {
  const { id, workItemId } = useParams<{ id: string; workItemId: string }>();
  const projectId = id ?? null;
  const navigate = useNavigate();

  const { data, loading, error, refetch } = useQuery<WorkItemQueryResult>(GET_WORK_ITEM, {
    variables: workItemId ? { id: workItemId } : undefined,
    skip: !workItemId,
    fetchPolicy: "network-only",
  });

  const [updateWorkItemMutation, { loading: isSaving }] = useMutation(UPDATE_WORK_ITEM);

  const workItem = data?.workItem ?? null;

  const [stagedTitle, setStagedTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [stagedStatus, setStagedStatus] = useState<TaskStatus>("new");
  const [stagedDescription, setStagedDescription] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const titleSizerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!workItem) {
      setStagedTitle("");
      setIsEditingTitle(false);
      setTitleError(null);
      setStagedStatus("new");
      setStagedDescription("");
      setIsEditingDescription(false);
      setFeedback(null);
      return;
    }
    setStagedTitle(workItem.title ?? "");
    setStagedStatus((workItem.status ?? "new") as TaskStatus);
    setStagedDescription(workItem.description ?? "");
    setIsEditingTitle(false);
    setTitleError(null);
    setIsEditingDescription(false);
  }, [workItem?.id, workItem?.title, workItem?.status, workItem?.description]);

  const updateTitleWidth = useCallback(() => {
    if (!titleSizerRef.current || !titleInputRef.current) return;
    const measuredWidth = titleSizerRef.current.offsetWidth;
    const basePadding = 24;
    const width = Math.max(measuredWidth + basePadding, 160);
    titleInputRef.current.style.width = `${width}px`;
  }, []);

  useEffect(() => {
    updateTitleWidth();
  }, [updateTitleWidth, stagedTitle, isEditingTitle]);

  const handleStatusChange = useCallback((nextStatus: TaskStatus) => {
    setStagedStatus(nextStatus);
    setFeedback(null);
  }, []);

  const handleTitleChange = useCallback((value: string) => {
    setStagedTitle(value);
    if (value.trim().length > 0) {
      setTitleError(null);
    }
    setFeedback(null);
  }, []);

  const handleDescriptionChange = useCallback((value: string) => {
    setStagedDescription(value);
    setFeedback(null);
  }, []);

  const handleCancelDescription = useCallback(() => {
    if (!workItem) return;
    setIsEditingDescription(false);
    setStagedDescription(workItem.description ?? "");
  }, [workItem]);

  const trimmedTitle = stagedTitle.trim();
  const hasTitleChanged = workItem ? trimmedTitle !== (workItem.title ?? "") : trimmedTitle.length > 0;
  const hasDescriptionChanged = workItem ? stagedDescription !== (workItem.description ?? "") : stagedDescription.length > 0;
  const hasStatusChanged = workItem ? stagedStatus !== ((workItem.status ?? "new") as TaskStatus) : false;
  const isDirty = hasTitleChanged || hasDescriptionChanged || hasStatusChanged;
  const isSaveDisabled = !workItem || isSaving || !isDirty || trimmedTitle.length === 0;

  const handleSave = useCallback(async () => {
    if (!workItem) return;
    const titleValue = trimmedTitle;
    if (titleValue.length === 0) {
      setTitleError("Title is required.");
      setIsEditingTitle(true);
      return;
    }

    const payload: Record<string, unknown> = {};
    if (titleValue !== workItem.title) {
      payload.title = titleValue;
    }

    const normalizedExistingDescription =
      workItem.description && workItem.description.trim().length > 0 ? workItem.description : null;
    const normalizedNextDescription =
      stagedDescription.trim().length > 0 ? stagedDescription : null;
    if (normalizedNextDescription !== normalizedExistingDescription) {
      payload.description = normalizedNextDescription;
    }

    if (stagedStatus !== ((workItem.status ?? "new") as TaskStatus)) {
      payload.status = stagedStatus;
    }

    if (Object.keys(payload).length === 0) {
      setIsEditingTitle(false);
      setIsEditingDescription(false);
      setFeedback({
        type: "success",
        message: "Everything is already up to date.",
      });
      return;
    }

    setFeedback(null);
    try {
      const result = await updateWorkItemMutation({
        variables: {
          id: workItem.id,
          input: payload,
        },
      });
      const updated = result.data?.updateWorkItem;
      if (updated) {
        await refetch();
        setStagedTitle(updated.title ?? "");
        setStagedStatus((updated.status ?? "new") as TaskStatus);
        setStagedDescription(updated.description ?? "");
        setIsEditingTitle(false);
        setIsEditingDescription(false);
        setFeedback({
          type: "success",
          message: "Work item updated.",
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Unable to update the work item.",
      });
    }
  }, [
    workItem,
    trimmedTitle,
    stagedDescription,
    stagedStatus,
    updateWorkItemMutation,
    refetch,
  ]);

  const typeLabel = useMemo(
    () => getWorkItemTypeLabel(workItem?.type ?? null),
    [workItem?.type]
  );

  const statusMeta = useMemo(() => STATUS_META[stagedStatus] ?? STATUS_META.new, [stagedStatus]);

  const updatedLabel = useMemo(() => {
    const source = workItem?.updated_at ?? workItem?.created_at ?? null;
    const relative = formatRelativeTimeFromNow(source);
    return `Updated ${relative}`;
  }, [workItem?.updated_at, workItem?.created_at]);

  if (!projectId) {
    return <div className="p-6 text-destructive">Project identifier is missing.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="inline-flex items-center gap-2 pl-0 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => navigate(`/projects/${projectId}/work-items`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to work items
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load work item</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? <WorkItemDetailsSkeleton /> : null}

      {!loading && !workItem ? (
        <Alert>
          <AlertTitle>Work item not found</AlertTitle>
          <AlertDescription>
            We couldn&apos;t locate this work item. It may have been deleted or you might not have access.
          </AlertDescription>
        </Alert>
      ) : null}

      {!loading && workItem ? (
        <div className="space-y-6">
          {feedback ? (
            <Alert variant={feedback.type === "error" ? "destructive" : "default"}>
              <AlertTitle>{feedback.type === "error" ? "Update failed" : "Changes saved"}</AlertTitle>
              <AlertDescription>{feedback.message}</AlertDescription>
            </Alert>
          ) : null}
          <div className="rounded-xl border border-border/70 bg-[hsl(var(--card))] p-6 shadow-sm">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{typeLabel}</p>
                  <div className="flex flex-wrap items-center gap-3 md:gap-4">
                    <div className="relative flex items-center">
                      <span
                        className="pointer-events-none invisible absolute whitespace-pre text-3xl font-semibold leading-tight"
                        ref={(element) => {
                          titleSizerRef.current = element;
                        }}
                      >
                        {stagedTitle || "Add a title..."}
                      </span>
                      {isEditingTitle ? (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-0 left-0 flex h-full w-[1.25rem] items-center justify-center rounded-l-md border border-border bg-[hsl(var(--card))]"
                        />
                      ) : null}
                      <Input
                        ref={titleInputRef}
                        value={stagedTitle}
                        readOnly={!isEditingTitle}
                        onClick={() => {
                          if (!isEditingTitle) {
                            setIsEditingTitle(true);
                            setTitleError(null);
                          }
                        }}
                        onChange={(event) => handleTitleChange(event.target.value)}
                        onBlur={() => setIsEditingTitle(false)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            void handleSave();
                          } else if (event.key === "Escape") {
                            event.preventDefault();
                            setIsEditingTitle(false);
                            setStagedTitle(workItem.title ?? "");
                            setTitleError(null);
                          }
                        }}
                        disabled={isEditingTitle && isSaving}
                        aria-invalid={titleError ? "true" : "false"}
                        className={
                          isEditingTitle
                            ? "relative z-10 h-11 min-w-[7.5rem] rounded-md border border-border bg-transparent pl-2 pr-1 text-left text-3xl font-semibold leading-tight text-foreground shadow-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
                            : "relative z-10 h-11 min-w-[7.5rem] rounded-md border border-transparent bg-transparent pl-2 pr-1 text-left text-3xl font-semibold leading-tight text-foreground cursor-text"
                        }
                        style={{ width: "auto" }}
                      />
                    </div>
                    <Badge className={statusMeta.badgeClass}>{statusMeta.label}</Badge>
                  </div>
                  {titleError ? <p className="text-xs text-destructive">{titleError}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleSave()}
                    disabled={isSaveDisabled}
                    className="inline-flex items-center gap-2 px-4"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isSaving ? "Saving…" : "Save"}
                  </Button>
                  {workItem.task?.id ? (
                    <Button
                      variant="outline"
                      className="inline-flex items-center gap-2"
                      onClick={() => navigate(`/projects/${projectId}/tasks/${workItem.task?.id}`)}
                    >
                      Open task view
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-background p-4 text-sm text-muted-foreground">
                {updatedLabel}
              </div>
              <div className="flex flex-wrap items-start gap-6">
                <div className="flex min-w-[11rem] flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">State</span>
                  <TaskStatusDropdown
                    value={stagedStatus}
                    onChange={handleStatusChange}
                    isUpdating={isSaving}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <Card className="border border-border/60">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base font-semibold text-foreground">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditingDescription ? (
                    <div className="space-y-3">
                      <Textarea
                        value={stagedDescription}
                        onChange={(event) => handleDescriptionChange(event.target.value)}
                        placeholder={`Add background context, goals, or implementation notes for this ${typeLabel.toLowerCase()}.`}
                        className="min-h-[160px] resize-y"
                        disabled={isSaving}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => void handleSave()}
                          disabled={isSaving || !hasDescriptionChanged}
                          className="inline-flex items-center gap-2"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            "Save"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleCancelDescription}
                          disabled={isSaving}
                          className="border border-border/70 text-muted-foreground hover:border-border hover:bg-neutral-200 hover:text-foreground dark:hover:bg-neutral-800"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      className="rounded-lg border border-transparent px-4 py-3 transition-colors hover:border-primary/40"
                        onClick={() => {
                          setIsEditingDescription(true);
                        }}
                      onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setIsEditingDescription(true);
                          }
                      }}
                    >
                      {stagedDescription.trim() ? (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                          {stagedDescription}
                        </div>
                      ) : (
                        <p className="text-sm italic text-muted-foreground">
                          Add background context, goals, or implementation notes for this {typeLabel.toLowerCase()}.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">Acceptance criteria</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm italic text-muted-foreground">
                    Capture the checklist that must be true before this {typeLabel.toLowerCase()} can be considered complete.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">Discussion</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {workItem.task?.id ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Continue the conversation in the linked task to keep implementation details in one place.
                      </p>
                      <Button
                        variant="outline"
                        className="inline-flex items-center gap-2"
                        onClick={() => navigate(`/projects/${projectId}/tasks/${workItem.task?.id}`)}
                      >
                        Open task discussion
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">
                      Link a story or task to start a discussion thread.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Status</span>
                    <span className="text-foreground">{statusMeta.label}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Priority</span>
                    <span className="text-foreground">{getPriorityLabel(workItem.priority ?? null)}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Estimate</span>
                    <span className="text-foreground">
                      {typeof workItem.estimate === "number" ? workItem.estimate : "Not set"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Due date</span>
                    <span className="flex items-center gap-2 text-foreground">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      {formatDate(workItem.due_date)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">Related work</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {workItem.parent ? (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent</span>
                      <Link
                        to={resolveWorkItemLink(projectId, workItem.parent.id, workItem.parent.type as WorkItemType)}
                        className="flex items-center justify-between gap-3 rounded-md border border-transparent px-3 py-2 text-sm transition-colors hover:border-border hover:bg-muted/50"
                      >
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {WORK_ITEM_TYPE_LABELS[workItem.parent.type as WorkItemType] ?? "Work Item"}
                          </p>
                          <p className="font-medium text-foreground">{workItem.parent.title}</p>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </div>
                  ) : null}
                  {workItem.children && workItem.children.length > 0 ? (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Children
                      </span>
                      <div className="space-y-2">
                        {workItem.children.map((child) => {
                          const childType = child.type as WorkItemType;
                          const childTypeLabel = WORK_ITEM_TYPE_LABELS[childType] ?? "Work Item";
                          return (
                            <Link
                              key={child.id}
                              to={resolveWorkItemLink(projectId, child.id, childType)}
                              className="flex items-center justify-between gap-3 rounded-md border border-transparent px-3 py-2 text-sm transition-colors hover:border-border hover:bg-muted/50"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {childTypeLabel}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    Status · {(child.status ?? "New").toString()}
                                  </span>
                                </div>
                                <p className="font-medium text-foreground">{child.title}</p>
                              </div>
                              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  {!workItem.parent && (!workItem.children || workItem.children.length === 0) ? (
                    <p className="text-sm italic text-muted-foreground">
                      Link related work to map the hierarchy for this {typeLabel.toLowerCase()}.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
