import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import { Link, useParams } from "react-router-dom";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import type { AuthUser, TaskStatus, WorkItem, WorkItemType } from "@shared/types";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from "../components/ui";
import { LIST_WORK_ITEMS } from "../graphql";
import { getWorkItemTypeLabel } from "../constants/workItems";
import { getWorkItemIconMeta } from "../constants/workItemVisuals";
import { WorkItemTemplateDropdown } from "../components/workItems/WorkItemTemplateDropdown";

type WorkItemsQueryResult = {
  workItems: WorkItem[];
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

function formatUpdatedLabel(updated?: string | null, created?: string | null): string {
  const source = updated ?? created;
  if (!source) {
    return "Recently updated";
  }
  return `Updated ${formatDate(source)}`;
}

function getLocationSummary(item: WorkItem): string {
  const segments: string[] = [];
  if (item.stage_id) {
    segments.push("Stage assigned");
  }
  if (item.sprint_id) {
    segments.push("Sprint assigned");
  }
  if (!segments.length) {
    segments.push("Backlog or unassigned");
  }
  return segments.join(" • ");
}

function WorkItemsSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="border-dashed">
          <CardHeader className="space-y-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-6 w-4/5" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/5" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function getPriorityLabel(priority?: WorkItem["priority"] | null): string {
  if (!priority) return "None";
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function resolveWorkItemLink(projectId: string, itemId: string, type: WorkItemType): string {
  if (type === "TASK" || type === "BUG") {
    return `/projects/${projectId}/tasks/${itemId}`;
  }
  return `/projects/${projectId}/work-items/${itemId}`;
}

export function ProjectWorkItemsPage({ user }: { user: AuthUser | null }) {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? null;

  const { data, loading, error } = useQuery<WorkItemsQueryResult>(LIST_WORK_ITEMS, {
    variables: projectId ? { project_id: projectId } : undefined,
    skip: !projectId || !user,
    fetchPolicy: "network-only",
  });

  const assignedWorkItems = useMemo(() => {
    if (!user) return [];
    const items = data?.workItems ?? [];
    return items
      .filter((item) => item.assignee?.id === user.id)
      .map((item) => ({
        ...item,
        status: (item.status ?? "new") as TaskStatus,
      }))
      .sort((a, b) => {
        const left = a.updated_at ?? a.created_at ?? "";
        const right = b.updated_at ?? b.created_at ?? "";
        return right.localeCompare(left);
      });
  }, [data?.workItems, user]);

  const hasWorkItems = assignedWorkItems.length > 0;

  if (!projectId) {
    return <div className="p-6 text-destructive">Project identifier is missing.</div>;
  }

  if (!user) {
    return (
      <Alert className="mt-4">
        <AlertTitle>Sign in required</AlertTitle>
        <AlertDescription>Sign in to see the tasks that are assigned to you.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Work items</h1>
          <p className="text-sm text-muted-foreground">
            A focused view of tasks assigned to you in this project. We&apos;ll add more filters and sorting soon.
          </p>
        </div>
        <WorkItemTemplateDropdown projectId={projectId} triggerLabel="Create from template" />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load work items</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? <WorkItemsSkeleton /> : null}

      {!loading && !hasWorkItems ? (
        <Alert>
          <AlertTitle>No work items yet</AlertTitle>
          <AlertDescription>
            Tasks assigned to you across this project will appear here. Pick up a task from the board or backlog to
            get started.
          </AlertDescription>
        </Alert>
      ) : null}

      {!loading && hasWorkItems ? (
        <div className="grid gap-4">
          {assignedWorkItems.map((item) => {
            const statusMeta = STATUS_META[item.status as TaskStatus] ?? STATUS_META.new;
            const dueDateLabel = item.due_date ? formatDate(item.due_date) : "No due date";
            const typeLabel = getWorkItemTypeLabel(item.type);
            const { icon: TypeIcon, colorClass: typeColorClass } = getWorkItemIconMeta(item.type);
            return (
              <Link
                key={item.id}
                to={resolveWorkItemLink(projectId, item.id, item.type)}
                className="group block"
              >
                <Card className="transition hover:border-blue-500/40 hover:shadow-md">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold leading-tight text-foreground">
                        <TypeIcon className={`h-4 w-4 shrink-0 ${typeColorClass}`} />
                        <span className="truncate">{item.title}</span>
                      </CardTitle>
                      <Badge className={statusMeta.badgeClass}>{statusMeta.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{getLocationSummary(item)}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatUpdatedLabel(item.updated_at, item.created_at)}</span>
                      <span className="inline-flex items-center gap-1 text-foreground/70 group-hover:text-blue-600">
                        View {typeLabel.toLowerCase()}
                        <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 text-foreground">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Priority</span>
                      <Badge variant="outline" className="bg-muted/30 text-xs font-medium capitalize text-foreground">
                        {getPriorityLabel(item.priority)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 opacity-70" />
                      <span>{dueDateLabel}</span>
                    </div>
                    {typeof item.estimate === "number" ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">Estimate</span>
                        <span className="text-foreground">{item.estimate}</span>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
