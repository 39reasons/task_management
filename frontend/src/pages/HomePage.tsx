import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@apollo/client";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  FolderOpen,
  Layers,
  ListChecks,
  Users,
} from "lucide-react";
import type { AuthUser, Project, Stage, Task, User, Workflow } from "@shared/types";
import { useAllTasksBoard } from "../hooks/useAllTasksBoard";
import { GET_PROJECTS_OVERVIEW } from "../graphql";
import { getInitials } from "../utils/user";
import { DEFAULT_AVATAR_COLOR } from "../constants/colors";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";

interface HomePageProps {
  user: AuthUser | null;
  setSelectedTask: (task: Task) => void;
}

type StageWithTasks = Stage & { tasks: Task[] };
type WorkflowWithStages = Workflow & { stages: StageWithTasks[] };
type ProjectOverview = Project & {
  workflows: WorkflowWithStages[];
  members?: User[];
};

interface TaskWithDue {
  task: Task;
  dueDate: Date;
}

interface ProjectSummary {
  project: ProjectOverview;
  workflowCount: number;
  stageCount: number;
  taskCount: number;
  memberCount: number;
  tagCount: number;
  overdueCount: number;
  nextDueTask: TaskWithDue | null;
}

interface WorkspaceTotals {
  totalProjects: number;
  publicProjects: number;
  privateProjects: number;
  workflowCount: number;
  stageCount: number;
  taskCount: number;
  memberCount: number;
  tagCount: number;
}

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});


function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function formatRelativeToToday(date: Date): string {
  const today = startOfToday();
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1) return `In ${diffDays} days`;
  if (diffDays === -1) return "1 day overdue";
  return `${Math.abs(diffDays)} days overdue`;
}

function WorkspaceSnapshot({ totals }: { totals: WorkspaceTotals }) {
  return (
    <div className="rounded-3xl border border-border/80 bg-slate-50 px-6 py-5 text-slate-900 shadow-lg shadow-slate-950/10 transition dark:border-white/10 dark:bg-white/10 dark:text-primary">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-900 dark:text-primary/80">
        Workspace snapshot
      </p>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-primary">
        {totals.taskCount}
      </p>
      <p className="text-sm text-slate-600 dark:text-primary/75">
        tasks across {totals.totalProjects} projects
      </p>
    </div>
  );
}

export function HomePage({ user, setSelectedTask: _setSelectedTask }: HomePageProps) {
  const {
    data,
    loading,
    error,
  } = useQuery<{ projects: ProjectOverview[] }>(GET_PROJECTS_OVERVIEW, {
    fetchPolicy: "network-only",
    nextFetchPolicy: "cache-first",
    errorPolicy: "all",
    returnPartialData: true,
  });

  const {
    stages,
    error: tasksError,
  } = useAllTasksBoard();

  const hasProjectError = Boolean(error);
  const tasksErrorMessage = (() => {
    if (!tasksError) return null;
    if (tasksError instanceof Error) return tasksError.message;
    if (typeof tasksError === "string") return tasksError;
    return "Unable to load tasks right now.";
  })();
  const hasTasksError = Boolean(tasksErrorMessage);
  const hasAnyError = hasProjectError || hasTasksError;

  const allTasks = useMemo<Task[]>(() => {
    return stages.flatMap((stage) => stage.tasks ?? []);
  }, [stages]);

  const totals = useMemo(() => {
    const projects = (data?.projects ?? []) as ProjectOverview[];
    let workflowCount = 0;
    let stageCount = 0;
    let taskCount = 0;
    const memberIds = new Set<string>();
    const tagIds = new Set<string>();

    for (const project of projects) {
      const workflows = project.workflows ?? [];
      workflowCount += workflows.length;

      for (const workflow of workflows) {
        const workflowStages = workflow.stages ?? [];
        stageCount += workflowStages.length;

        for (const stage of workflowStages) {
          const stageTasks = stage.tasks ?? [];
          taskCount += stageTasks.length;

          for (const task of stageTasks) {
            for (const tag of task.tags ?? []) {
              if (tag?.id) {
                tagIds.add(tag.id);
              }
            }
          }
        }
      }

      for (const member of project.members ?? []) {
        if (member?.id) {
          memberIds.add(member.id);
        }
      }
    }

    const totalProjects = projects.length;
    const publicProjects = projects.filter((project) => project.is_public).length;
    const privateProjects = totalProjects - publicProjects;

    return {
      totalProjects,
      publicProjects,
      privateProjects,
      workflowCount,
      stageCount,
      taskCount,
      memberCount: memberIds.size,
      tagCount: tagIds.size,
    };
  }, [data]);

  const projectSummaries = useMemo<ProjectSummary[]>(() => {
    const projects = (data?.projects ?? []) as ProjectOverview[];
    const todayStart = startOfToday();
    return projects.map((project) => {
      const workflows = project.workflows ?? [];
      const workflowCount = workflows.length;
      let stageCount = 0;
      const projectTasks: Task[] = [];

      for (const workflow of workflows) {
        const workflowStages = workflow.stages ?? [];
        stageCount += workflowStages.length;
        for (const stage of workflowStages) {
          projectTasks.push(...(stage.tasks ?? []));
        }
      }

      const tagIds = new Set<string>();
      const upcoming: TaskWithDue[] = [];
      let overdueCount = 0;

      for (const task of projectTasks) {
        for (const tag of task.tags ?? []) {
          if (tag?.id) {
            tagIds.add(tag.id);
          }
        }
        const dueDate = toDate(task.due_date);
        if (!dueDate) continue;
        if (dueDate < todayStart) {
          overdueCount += 1;
        } else {
          upcoming.push({ task, dueDate });
        }
      }

      upcoming.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

      return {
        project,
        workflowCount,
        stageCount,
        taskCount: projectTasks.length,
        memberCount: project.members?.length ?? 0,
        tagCount: tagIds.size,
        overdueCount,
        nextDueTask: upcoming[0] ?? null,
      };
    });
  }, [data]);

  const prioritySummary = useMemo(() => {
    const summary: Record<"high" | "medium" | "low" | "none", number> = {
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
    };
    for (const task of allTasks) {
      if (task.priority === "high" || task.priority === "medium" || task.priority === "low") {
        summary[task.priority] += 1;
      } else {
        summary.none += 1;
      }
    }
    return summary;
  }, [allTasks]);

  const { upcomingTasks, overdueTasks } = useMemo(() => {
    const upcomingList: TaskWithDue[] = [];
    const overdueList: TaskWithDue[] = [];
    const todayStart = startOfToday();

    for (const task of allTasks) {
      const dueDate = toDate(task.due_date);
      if (!dueDate) continue;
      if (dueDate < todayStart) {
        overdueList.push({ task, dueDate });
      } else {
        upcomingList.push({ task, dueDate });
      }
    }

    upcomingList.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    overdueList.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return {
      upcomingTasks: upcomingList.slice(0, 5),
      overdueTasks: overdueList.slice(0, 5),
    };
  }, [allTasks]);

  const showProjectsEmptyState = !loading && projectSummaries.length === 0;
  return (
    <div className="space-y-8 pb-6">
      <section className="rounded-3xl border border-border bg-card px-6 py-8 shadow-lg shadow-slate-950/5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              {user
                ? `Welcome back, ${user.first_name ?? user.username}!`
                : "Welcome to JellyFlow"}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {user ? "Your workspace at a glance" : "Organize projects, workflows, and tasks in one place"}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Projects collect your workflows, workflows group stages, and stages hold the tasks that power your team.
              Invite teammates to collaborate, and keep work on track with due dates, priorities, and tags.
            </p>
          </div>
          <div className="w-full max-w-xs">
            {user ? (
              <WorkspaceSnapshot totals={totals} />
            ) : (
              <Button asChild className="w-full">
                <Link to="/signup">Create your workspace</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {hasAnyError ? (
        <div className="space-y-2">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load projects</AlertTitle>
              <AlertDescription>{error.message ?? "Something went wrong."}</AlertDescription>
            </Alert>
          ) : null}
          {tasksErrorMessage ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load tasks</AlertTitle>
              <AlertDescription>{tasksErrorMessage}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#d2e2fb] text-[#1f6feb] transition dark:bg-blue-500/30 dark:text-blue-200">
              <FolderOpen className="h-5 w-5" />
            </span>
            <span className="text-xs text-muted-foreground">
              {totals.totalProjects ? `${totals.publicProjects} public · ${totals.privateProjects} private` : "No projects yet"}
            </span>
          </div>
          <p className="mt-5 text-3xl font-semibold text-foreground">{totals.totalProjects}</p>
          <p className="text-sm text-blue-500 dark:text-primary">Projects in workspace</p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <Layers className="h-5 w-5" />
            </span>
            <span className="text-xs text-muted-foreground">
              {totals.stageCount} stages
            </span>
          </div>
          <p className="mt-5 text-3xl font-semibold text-foreground">{totals.workflowCount}</p>
          <p className="text-sm text-muted-foreground">Active workflows</p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-600">
              <ListChecks className="h-5 w-5" />
            </span>
            <span className="text-xs text-muted-foreground">
              {prioritySummary.high} high · {prioritySummary.medium} med · {prioritySummary.low} low · {prioritySummary.none} none
            </span>
          </div>
          <p className="mt-5 text-3xl font-semibold text-foreground">{totals.taskCount}</p>
          <p className="text-sm text-muted-foreground">Tasks in play</p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <Users className="h-5 w-5" />
            </span>
            <span className="text-xs text-muted-foreground">
              {totals.tagCount} tags
            </span>
          </div>
          <p className="mt-5 text-3xl font-semibold text-foreground">{totals.memberCount}</p>
          <p className="text-sm text-muted-foreground">Collaborators</p>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Projects overview</h2>
            <p className="text-sm text-muted-foreground">
              Browse the projects you can access, their workflows, and the tasks moving through each stage.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {loading ? "Loading projects…" : `${projectSummaries.length} project${projectSummaries.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {showProjectsEmptyState ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            {user ? (
              <p>
                No projects yet. Use the sidebar to create your first project and we’ll populate this overview.
              </p>
            ) : (
              <p>
                Sign in to see private projects or explore public workspaces once they’re shared.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projectSummaries.map((summary) => (
              <Link
                key={summary.project.id}
                to={`/projects/${summary.project.id}`}
                className="group flex h-full flex-col rounded-3xl border border-border bg-card p-5 transition duration-200 hover:border-primary/30 hover:bg-muted/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-foreground">{summary.project.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {summary.project.description?.trim() || "No description yet."}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      summary.project.is_public
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-border bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {summary.project.is_public ? "Public" : "Private"}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
                  <div className="rounded-2xl bg-muted px-3 py-2">
                    <p className="text-base font-semibold text-foreground">{summary.workflowCount}</p>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Workflows</p>
                  </div>
                  <div className="rounded-2xl bg-muted px-3 py-2">
                    <p className="text-base font-semibold text-foreground">{summary.stageCount}</p>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Stages</p>
                  </div>
                  <div className="rounded-2xl bg-muted px-3 py-2">
                    <p className="text-base font-semibold text-foreground">{summary.taskCount}</p>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Tasks</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div className="rounded-2xl border border-border bg-card px-3 py-2 text-left dark:border-white/10 dark:bg-[hsl(var(--sidebar-background))]">
                    <p className="text-sm font-semibold text-foreground">{summary.tagCount}</p>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Tags in use</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card px-3 py-2 text-left dark:border-white/10 dark:bg-[hsl(var(--sidebar-background))]">
                    <p className="text-sm font-semibold text-foreground">{summary.overdueCount}</p>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Overdue tasks</p>
                  </div>
                </div>

                <div className="mt-4">
                  {summary.nextDueTask ? (
                    <div className="rounded-2xl border border-border bg-card px-4 py-3 text-xs text-foreground shadow-sm dark:border-white/10 dark:bg-[hsl(var(--sidebar-background))] dark:text-primary">
                      <p className="text-sm font-semibold text-foreground dark:text-primary">
                        Next due · {summary.nextDueTask.task.title}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground/80 dark:text-primary/70">
                        {formatRelativeToToday(summary.nextDueTask.dueDate)} · {SHORT_DATE_FORMATTER.format(summary.nextDueTask.dueDate)}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground dark:border-white/10 dark:bg-[hsl(var(--sidebar-background))] dark:text-primary/70">
                      No upcoming due dates.
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {(summary.project.members ?? []).slice(0, 4).map((member) => (
                        <span
                          key={member.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-xs font-semibold text-primary"
                          style={{ backgroundColor: member.avatar_color ?? DEFAULT_AVATAR_COLOR }}
                        >
                          {getInitials(member)}
                        </span>
                      ))}
                    </div>
                    {summary.project.members && summary.project.members.length > 4 ? (
                      <span className="text-xs text-muted-foreground">
                        +{summary.project.members.length - 4}
                      </span>
                    ) : null}
                    {(!summary.project.members || summary.project.members.length === 0) && (
                      <span className="text-xs text-muted-foreground">No members yet</span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500 transition group-hover:bg-blue-500/20 group-hover:text-blue-600 dark:bg-white/10 dark:text-primary dark:group-hover:bg-white/20 dark:group-hover:text-primary/80">
                    View board
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card px-5 py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Upcoming due dates</h2>
              <p className="text-sm text-muted-foreground">The next tasks scheduled across all workflows.</p>
            </div>
            <CalendarClock className="h-5 w-5 text-primary" />
          </div>

          {upcomingTasks.length === 0 ? (
            <p className="mt-6 rounded-3xl border border-white/10 bg-[hsl(var(--sidebar-background))] px-4 py-3 text-sm text-primary/75">
              No upcoming due dates. Assign due dates to tasks to see them here.
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {upcomingTasks.map(({ task, dueDate }) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground transition hover:border-primary/30 hover:bg-muted/60 dark:border-white/10 dark:bg-[hsl(var(--sidebar-background))] dark:text-primary"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground dark:text-primary">{task.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground dark:text-primary/70">
                      {task.stage?.name ?? "Stage"} · {SHORT_DATE_FORMATTER.format(dueDate)} · {formatRelativeToToday(dueDate)}
                    </p>
                  </div>
                  <Link
                    to={`/projects/${task.project_id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition hover:text-primary/80"
                  >
                    View
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-card px-5 py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Overdue tasks</h2>
              <p className="text-sm text-muted-foreground">Tasks that need attention across every project.</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>

          {overdueTasks.length === 0 ? (
            <p className="mt-6 rounded-3xl border border-white/10 bg-[hsl(var(--sidebar-background))] px-4 py-3 text-sm text-primary/75">
              Great news! Nothing is overdue right now.
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {overdueTasks.map(({ task, dueDate }) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground transition hover:border-destructive/30 hover:bg-muted/60 dark:border-white/10 dark:bg-[hsl(var(--sidebar-background))] dark:text-primary"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground dark:text-primary">{task.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground dark:text-primary/70">
                      {task.stage?.name ?? "Stage"} · {SHORT_DATE_FORMATTER.format(dueDate)} · {formatRelativeToToday(dueDate)}
                    </p>
                  </div>
                  <Link
                    to={`/projects/${task.project_id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition hover:text-primary/80"
                  >
                    View
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

    </div>
  );
}
