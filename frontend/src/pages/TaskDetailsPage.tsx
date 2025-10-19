import { useCallback, useEffect, useMemo, useState } from "react";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import type { AuthUser, Task, TaskStatus } from "@shared/types";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from "../components/ui";
import { AssigneeDropdown } from "../components/TaskModal/AssigneeDropdown";
import type { ProjectMember } from "../components/TaskModal/types";
import { useAssigneePicker } from "../components/TaskModal/useAssigneePicker";
import { TaskStatusDropdown } from "../components/tasks/TaskStatusDropdown";
import {
  GET_PROJECT_MEMBERS,
  GET_TASK,
  SEARCH_USERS,
  SET_TASK_ASSIGNEE,
  UPDATE_TASK,
} from "../graphql";
import { DEFAULT_AVATAR_COLOR } from "../constants/colors";
import { getFullName, getInitials } from "../utils/user";

type TaskQueryResult = {
  task: Task | null;
};

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

function getPriorityLabel(priority?: Task["priority"] | null): string {
  if (!priority) return "None";
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function TaskDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-5 w-40" />
      <Card>
        <CardHeader className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="flex gap-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-10 rounded-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
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

function resolveUserLabel(user: AuthUser | null): string {
  if (!user) return "someone";
  const fullName = getFullName(user);
  if (fullName && fullName.trim().length > 0) {
    return fullName;
  }
  if (user.username && user.username.trim().length > 0) {
    return `@${user.username}`;
  }
  return "someone";
}

function buildUpdatedByLabel(userLabel: string, timestamp?: string | null): string {
  const relative = formatRelativeTimeFromNow(timestamp);
  return `Updated by ${userLabel} ${relative}`;
}

export function TaskDetailsPage({ user }: { user: AuthUser | null }) {
  const { id, taskId } = useParams<{ id: string; taskId: string }>();
  const projectId = id ?? null;
  const navigate = useNavigate();

  const { data, loading, error, refetch } = useQuery<TaskQueryResult>(GET_TASK, {
    variables: taskId ? { id: taskId } : undefined,
    skip: !taskId,
    fetchPolicy: "network-only",
  });

  const task = data?.task ?? null;

  const stageLabel = useMemo(() => {
    if (!task) return "Not assigned to a board stage";
    return task.stage?.name ?? "Backlog or unassigned";
  }, [task]);

  const { data: projectMembersData, loading: isMembersLoading } = useQuery(GET_PROJECT_MEMBERS, {
    variables: projectId ? { project_id: projectId } : undefined,
    skip: !projectId || !user,
  });

  const projectMembers = useMemo(
    () => (projectMembersData?.projectMembers ?? []) as ProjectMember[],
    [projectMembersData]
  );

  const [searchUsers, { loading: isSearchingMembers }] = useLazyQuery(SEARCH_USERS, {
    fetchPolicy: "no-cache",
  });

  const [stagedStatus, setStagedStatus] = useState<TaskStatus>("new");
  const [stagedAssignee, setStagedAssignee] = useState<Task["assignee"] | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [assigneeError, setAssigneeError] = useState<string | null>(null);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isAssigneeUpdating, setIsAssigneeUpdating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [updatedByLabel, setUpdatedByLabel] = useState<string>("");

  useEffect(() => {
    if (!task) {
      setStagedStatus("new");
      setStagedAssignee(null);
      setStatusError(null);
      setAssigneeError(null);
      return;
    }
    setStagedStatus((task.status ?? "new") as TaskStatus);
    setStagedAssignee(task.assignee ?? null);
    setStatusError(null);
    setAssigneeError(null);
  }, [task?.assignee, task?.id, task?.status]);

  useEffect(() => {
    if (!task) {
      setUpdatedByLabel("");
      return;
    }
    const label = resolveUserLabel(user);
    const timestamp = task.updated_at ?? task.created_at ?? null;
    setUpdatedByLabel(buildUpdatedByLabel(label, timestamp));
  }, [task?.updated_at, task?.created_at, task?.id, user?.first_name, user?.last_name, user?.username]);

  const [updateTaskMutation] = useMutation(UPDATE_TASK);
  const [setTaskAssigneeMutation] = useMutation(SET_TASK_ASSIGNEE);

  const handleStatusChange = useCallback(
    (nextStatus: TaskStatus) => {
      setStatusError(null);
      setStagedStatus(nextStatus);
    },
    []
  );

  const stageAssigneeById = useCallback(
    (memberId: string | null) => {
      setAssigneeError(null);
      if (!memberId) {
        setStagedAssignee(null);
        return;
      }
      setStagedAssignee((previous) => {
        if (previous?.id === memberId) {
          return previous;
        }
        const member = projectMembers.find((candidate) => candidate.id === memberId);
        if (!member) {
          return previous;
        }
        return {
          id: member.id,
          first_name: member.first_name,
          last_name: member.last_name,
          username: member.username,
          avatar_color: member.avatar_color ?? null,
        };
      });
    },
    [projectMembers]
  );

  const handleAssignMember = useCallback(
    (memberId: string) => {
      stageAssigneeById(memberId);
    },
    [stageAssigneeById]
  );

  const handleClearAssignee = useCallback(() => {
    stageAssigneeById(null);
  }, [stageAssigneeById]);

  const handleSearchMembers = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        return projectMembers;
      }

      try {
        const { data: searchData } = await searchUsers({ variables: { query: trimmed } });
        const results = (searchData?.searchUsers ?? []) as ProjectMember[];
        const seen = new Set<string>();
        return results.filter((candidate) => {
          if (seen.has(candidate.id)) {
            return false;
          }
          seen.add(candidate.id);
          return true;
        });
      } catch (searchError) {
        console.error("Failed to search teammates", searchError);
        return [];
      }
    },
    [projectMembers, searchUsers]
  );

  const handleSave = useCallback(async () => {
    if (!task || !user) return;

    const currentStatusValue = (task.status ?? "new") as TaskStatus;
    const currentAssigneeId = task.assignee?.id ?? null;
    const stagedAssigneeId = stagedAssignee?.id ?? null;

    const statusChanged = stagedStatus !== currentStatusValue;
    const assigneeChanged = currentAssigneeId !== stagedAssigneeId;

    if (!statusChanged && !assigneeChanged) {
      return;
    }

    setStatusError(null);
    setAssigneeError(null);
    setIsSaving(true);
    setIsStatusUpdating(statusChanged);
    setIsAssigneeUpdating(assigneeChanged);

    let didUpdateStatus = false;
    let didUpdateAssignee = false;

    if (statusChanged) {
      try {
        await updateTaskMutation({
          variables: { id: task.id, status: stagedStatus },
        });
        didUpdateStatus = true;
      } catch (updateError) {
        console.error("Failed to update task status", updateError);
        setStatusError(
          updateError instanceof Error ? updateError.message : "Failed to update status"
        );
      }
    }

    if (assigneeChanged) {
      try {
        await setTaskAssigneeMutation({
          variables: { task_id: task.id, member_id: stagedAssigneeId },
        });
        didUpdateAssignee = true;
      } catch (assignError) {
        console.error("Failed to update task assignee", assignError);
        setAssigneeError(
          assignError instanceof Error ? assignError.message : "Failed to update assignee"
        );
      }
    }

    const shouldRefetch = didUpdateStatus || didUpdateAssignee;

    if (shouldRefetch) {
      const label = resolveUserLabel(user);
      setUpdatedByLabel(`Updated by ${label} just now`);
      await refetch({ id: task.id }).catch(() => undefined);
    }

    setIsSaving(false);
    setIsStatusUpdating(false);
    setIsAssigneeUpdating(false);
  }, [refetch, setTaskAssigneeMutation, stagedAssignee, stagedStatus, task, updateTaskMutation, user]);

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
    assignee: stagedAssignee ?? null,
    members: projectMembers,
    onSearchMembers: handleSearchMembers,
    isMembersLoading,
    isSearchingMembers,
    onAssignMember: handleAssignMember,
    isAssigningAssignee: isAssigneeUpdating || isSaving,
  });

  if (!projectId || !taskId) {
    return <div className="p-6 text-destructive">Task or project identifier is missing.</div>;
  }

  if (!user) {
    return (
      <Alert className="mt-4">
        <AlertTitle>Sign in required</AlertTitle>
        <AlertDescription>Sign in to view task details.</AlertDescription>
      </Alert>
    );
  }

  const sprintLabel = task?.sprint?.name ?? "Not added to a sprint";
  const dueDateLabel = formatDate(task?.due_date);
  const updatedLabel = formatDate(task?.updated_at ?? task?.created_at);

  const tags = task?.tags ?? [];
  const hasTags = tags.length > 0;
  const currentAssignee = task?.assignee ?? null;
  const currentStatus = (task?.status ?? "new") as TaskStatus;
  const stagedAssigneeId = stagedAssignee?.id ?? null;
  const currentAssigneeId = currentAssignee?.id ?? null;
  const hasStatusChanged = task ? stagedStatus !== currentStatus : false;
  const hasAssigneeChanged = task ? currentAssigneeId !== stagedAssigneeId : false;
  const hasUnsavedChanges = hasStatusChanged || hasAssigneeChanged;
  const isSaveDisabled = !task || !hasUnsavedChanges || isSaving;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          className="gap-2 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => navigate(`/projects/${projectId}/work-items`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to work items
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load task</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? <TaskDetailsSkeleton /> : null}

      {!loading && !task ? (
        <Alert>
          <AlertTitle>Task not found</AlertTitle>
          <AlertDescription>
            We couldn&apos;t locate this task. It may have been deleted or you might not have access.
          </AlertDescription>
        </Alert>
      ) : null}

      {!loading && task ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-border/70 bg-[hsl(var(--card))] p-6 shadow-sm">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Work item</p>
                  <CardTitle className="text-3xl font-semibold leading-tight text-foreground">{task.title}</CardTitle>
                </div>
                <div className="lg:-mt-12">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleSave()}
                    disabled={isSaveDisabled}
                    className="inline-flex items-center gap-2 px-4"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-start gap-6">
                <div className="flex min-w-[11rem] flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">State</span>
                  <TaskStatusDropdown
                    value={stagedStatus}
                    onChange={handleStatusChange}
                    isUpdating={isStatusUpdating}
                    disabled={isSaving}
                  />
                  {statusError ? <span className="text-xs text-destructive">{statusError}</span> : null}
                </div>
                <div className="flex min-w-[12rem] flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Assignee
                  </span>
                  <AssigneeDropdown
                    assignee={stagedAssignee ?? null}
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
                    onClearAssignee={handleClearAssignee}
                    isAssigningAssignee={isAssigneeUpdating || isSaving}
                    onInputKeyDown={handleInputKeyDown}
                  />
                  {assigneeError ? <span className="text-xs text-destructive">{assigneeError}</span> : null}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tags</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {hasTags ? (
                      tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="border border-border px-2 py-0.5 text-[11px] font-medium"
                          style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                        >
                          {tag.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </div>
                </div>
                {updatedByLabel ? (
                  <div className="ml-auto mt-6 flex text-right lg:mt-10">
                    <p className="text-xs text-muted-foreground">{updatedByLabel}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  {task.description?.trim() ? (
                    <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                      <p>{task.description}</p>
                    </div>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">
                      Add background context, goals, or implementation notes for this work item.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">Acceptance criteria</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm italic text-muted-foreground">
                    Capture the checklist that must be true before this task can be considered complete.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">Discussion</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Conversation history will appear here. Collaborate with teammates directly from the task board while
                    we finish building inline comments for this view.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-3 text-sm">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Assignee</dt>
                      <dd className="mt-1 text-foreground">
                        {stagedAssignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8 border border-border/60">
                              <AvatarFallback
                                className="text-xs font-semibold uppercase text-primary"
                                style={{ backgroundColor: stagedAssignee.avatar_color ?? DEFAULT_AVATAR_COLOR }}
                              >
                                {getInitials(stagedAssignee)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col leading-tight">
                              <span className="text-sm font-medium text-foreground">
                                {getFullName(stagedAssignee) || stagedAssignee.username}
                              </span>
                              <span className="text-xs text-muted-foreground">@{stagedAssignee.username}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Priority</dt>
                      <dd className="mt-1 text-foreground">{getPriorityLabel(task.priority)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Estimate</dt>
                      <dd className="mt-1 text-foreground">
                        {typeof task.estimate === "number" ? task.estimate : "Not set"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Due date</dt>
                      <dd className="mt-1 text-foreground">{dueDateLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Stage</dt>
                      <dd className="mt-1 text-foreground">{stageLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Sprint</dt>
                      <dd className="mt-1 text-foreground">{sprintLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Task ID</dt>
                      <dd className="mt-1 text-muted-foreground">#{task.id}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">Related work</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Link upstream dependencies, specs, or pull requests so the team can trace work across tools.
                  </p>
                  <Button type="button" size="sm" variant="outline" disabled className="w-full cursor-not-allowed">
                    Add link (coming soon)
                  </Button>
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">Deployment</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Connect your release pipeline to surface deployment status directly alongside the task once the
                    integration is enabled.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
