import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock3 } from "lucide-react";
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
import { GET_TASK } from "../graphql";
import { DEFAULT_AVATAR_COLOR } from "../constants/colors";
import { getFullName, getInitials } from "../utils/user";

type TaskQueryResult = {
  task: Task | null;
};

const STATUS_META: Record<
  TaskStatus,
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

export function TaskDetailsPage({ user }: { user: AuthUser | null }) {
  const { id, taskId } = useParams<{ id: string; taskId: string }>();
  const projectId = id ?? null;
  const navigate = useNavigate();

  const { data, loading, error } = useQuery<TaskQueryResult>(GET_TASK, {
    variables: taskId ? { id: taskId } : undefined,
    skip: !taskId,
    fetchPolicy: "network-only",
  });

  const task = data?.task ?? null;

  const stageLabel = useMemo(() => {
    if (!task) return "Not assigned to a workflow stage";
    return task.stage?.name ?? "Backlog or unassigned";
  }, [task]);

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
  const statusMeta = task ? STATUS_META[(task.status ?? "new") as TaskStatus] ?? STATUS_META.new : STATUS_META.new;

  const tags = task?.tags ?? [];
  const hasTags = tags.length > 0;
  const assignee = task?.assignee ?? null;
  const hasAssignee = Boolean(assignee);

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
          <div className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <CardTitle className="text-3xl font-semibold text-foreground">{task.title}</CardTitle>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={statusMeta.badgeClass}>{statusMeta.label}</Badge>
                  <Badge variant="outline" className="border-border text-xs font-semibold text-foreground">
                    Priority · {getPriorityLabel(task.priority)}
                  </Badge>
                  <Badge variant="outline" className="border-border text-xs font-semibold text-foreground">
                    Estimate · {typeof task.estimate === "number" ? task.estimate : "Not set"}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 className="h-4 w-4" />
                <span>Last updated {updatedLabel}</span>
              </div>
            </div>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground">Task metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Stage</dt>
                  <dd className="text-sm text-foreground">{stageLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Sprint</dt>
                  <dd className="text-sm text-foreground">{sprintLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Due date</dt>
                  <dd className="flex items-center gap-2 text-sm text-foreground">
                    <CalendarDays className="h-4 w-4 opacity-70" />
                    <span>{dueDateLabel}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Task ID</dt>
                  <dd className="text-sm text-muted-foreground">#{task.id}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground">Description</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description?.trim() ? (
                <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                  <p>{task.description}</p>
                </div>
              ) : (
                <p className="text-sm italic text-muted-foreground">No description yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base font-semibold text-foreground">Assignee</CardTitle>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {hasAssignee ? "1 member" : "Unassigned"}
              </span>
            </CardHeader>
            <CardContent>
              {hasAssignee && assignee ? (
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border/60 shadow-sm">
                    <AvatarFallback
                      className="text-sm font-semibold uppercase text-primary-foreground"
                      style={{ backgroundColor: assignee.avatar_color ?? DEFAULT_AVATAR_COLOR }}
                    >
                      {getInitials(assignee)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{getFullName(assignee) || assignee.username}</p>
                    <p className="text-xs text-muted-foreground">@{assignee.username}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No one is assigned to this task yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base font-semibold text-foreground">Tags</CardTitle>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {hasTags ? `${tags.length} tag${tags.length === 1 ? "" : "s"}` : "0 tags"}
              </span>
            </CardHeader>
            <CardContent>
              {hasTags ? (
                <div className="flex flex-wrap items-center gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="border border-border px-3 py-1 text-xs font-medium"
                      style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Tags help categorize work. None added yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
