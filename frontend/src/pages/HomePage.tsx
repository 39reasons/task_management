import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { AlertTriangle, ArrowUpRight, CalendarClock, FolderOpen, Layers, ListChecks, Users } from "lucide-react";
import type { AuthUser, Project, Stage, Task, User, Workflow } from "@shared/types";
import { useAllTasksBoard } from "../hooks/useAllTasksBoard";
import { GET_PROJECTS_OVERVIEW } from "../graphql";
import { getInitials } from "../utils/user";
import { DEFAULT_AVATAR_COLOR } from "../constants/colors";

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

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

const LONG_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
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

function formatUpdatedAt(value?: string | null): string {
  const parsed = toDate(value);
  if (!parsed) return "—";
  return LONG_DATE_FORMATTER.format(parsed);
}

export function HomePage({ user, setSelectedTask: _setSelectedTask }: HomePageProps) {
  const {
    data,
    loading,
    error,
  } = useQuery<{ projects: ProjectOverview[] }>(GET_PROJECTS_OVERVIEW, {
    fetchPolicy: "cache-and-network",
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
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950 px-6 py-8 shadow-lg shadow-slate-950/40">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-blue-200/80">
              {user
                ? `Welcome back, ${user.first_name ?? user.username}!`
                : "Welcome to JellyFlow"}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {user ? "Your workspace at a glance" : "Organize projects, workflows, and tasks in one place"}
            </h1>
            <p className="max-w-2xl text-sm text-slate-300">
              Projects collect your workflows, workflows group stages, and stages hold the tasks that power your team.
              Invite teammates to collaborate, and keep work on track with due dates, priorities, and tags.
            </p>
          </div>
          <div className="w-full max-w-xs">
            {user ? (
              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-blue-100 shadow-inner shadow-blue-900/30">
                <p className="text-xs uppercase tracking-wide text-blue-200/80">
                  Workspace snapshot
                </p>
                <p className="mt-2 text-3xl font-semibold">
                  {totals.taskCount}
                </p>
                <p className="text-xs text-blue-100/80">
                  tasks across {totals.totalProjects} projects
                </p>
              </div>
            ) : (
              <Link
                to="/signup"
                className="inline-flex w-full items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 px-5 py-2.5 text-sm font-semibold text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/20"
              >
                Create your workspace
              </Link>
            )}
          </div>
        </div>
      </section>

      {hasAnyError && (
        <div className="space-y-2">
          {error ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error.message || "Unable to load projects right now."}
            </div>
          ) : null}
          {tasksErrorMessage ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {tasksErrorMessage}
            </div>
          ) : null}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-800/70 bg-slate-900/75 p-5 shadow-inner shadow-slate-950/40">
          <div className="flex items-start justify-between">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/15 text-blue-200">
              <FolderOpen className="h-5 w-5" />
            </span>
            <span className="text-xs text-slate-400">
              {totals.totalProjects ? `${totals.publicProjects} public · ${totals.privateProjects} private` : "No projects yet"}
            </span>
          </div>
          <p className="mt-5 text-3xl font-semibold text-white">{totals.totalProjects}</p>
          <p className="text-sm text-slate-400">Projects in workspace</p>
        </div>

        <div className="rounded-3xl border border-slate-800/70 bg-slate-900/75 p-5 shadow-inner shadow-slate-950/40">
          <div className="flex items-start justify-between">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-200">
              <Layers className="h-5 w-5" />
            </span>
            <span className="text-xs text-slate-400">
              {totals.stageCount} stages
            </span>
          </div>
          <p className="mt-5 text-3xl font-semibold text-white">{totals.workflowCount}</p>
          <p className="text-sm text-slate-400">Active workflows</p>
        </div>

        <div className="rounded-3xl border border-slate-800/70 bg-slate-900/75 p-5 shadow-inner shadow-slate-950/40">
          <div className="flex items-start justify-between">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/15 text-purple-200">
              <ListChecks className="h-5 w-5" />
            </span>
            <span className="text-xs text-slate-400">
              {prioritySummary.high} high · {prioritySummary.medium} med · {prioritySummary.low} low · {prioritySummary.none} none
            </span>
          </div>
          <p className="mt-5 text-3xl font-semibold text-white">{totals.taskCount}</p>
          <p className="text-sm text-slate-400">Tasks in play</p>
        </div>

        <div className="rounded-3xl border border-slate-800/70 bg-slate-900/75 p-5 shadow-inner shadow-slate-950/40">
          <div className="flex items-start justify-between">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-200">
              <Users className="h-5 w-5" />
            </span>
            <span className="text-xs text-slate-400">
              {totals.tagCount} tags
            </span>
          </div>
          <p className="mt-5 text-3xl font-semibold text-white">{totals.memberCount}</p>
          <p className="text-sm text-slate-400">Collaborators</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800/70 bg-slate-900/70 px-6 py-6 shadow-lg shadow-slate-950/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Projects overview</h2>
            <p className="text-sm text-slate-400">
              Browse the projects you can access, their workflows, and the tasks moving through each stage.
            </p>
          </div>
          <span className="text-xs text-slate-500">
            {loading ? "Loading projects…" : `${projectSummaries.length} project${projectSummaries.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {showProjectsEmptyState ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-4 py-8 text-center text-sm text-slate-400">
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
                className="group flex h-full flex-col rounded-3xl border border-slate-800/70 bg-slate-900/80 p-5 transition duration-200 hover:border-blue-500/40 hover:bg-slate-900/95"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-white">{summary.project.name}</h3>
                    <p className="text-sm text-slate-300">
                      {summary.project.description?.trim() || "No description yet."}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      summary.project.is_public
                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                        : "border-slate-700 bg-slate-800 text-slate-300"
                    }`}
                  >
                    {summary.project.is_public ? "Public" : "Private"}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs text-slate-300">
                  <div className="rounded-2xl bg-slate-950/60 px-3 py-2">
                    <p className="text-base font-semibold text-white">{summary.workflowCount}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Workflows</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950/60 px-3 py-2">
                    <p className="text-base font-semibold text-white">{summary.stageCount}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Stages</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950/60 px-3 py-2">
                    <p className="text-base font-semibold text-white">{summary.taskCount}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Tasks</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
                  <div className="rounded-2xl border border-slate-800/60 bg-slate-900/80 px-3 py-2 text-left">
                    <p className="text-sm font-semibold text-white">{summary.tagCount}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Tags in use</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800/60 bg-slate-900/80 px-3 py-2 text-left">
                    <p className="text-sm font-semibold text-white">{summary.overdueCount}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Overdue tasks</p>
                  </div>
                </div>

                <div className="mt-4">
                  {summary.nextDueTask ? (
                    <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-xs text-blue-100 shadow-inner shadow-blue-900/20">
                      <p className="text-sm font-semibold text-blue-100">
                        Next due · {summary.nextDueTask.task.title}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-blue-200/80">
                        {formatRelativeToToday(summary.nextDueTask.dueDate)} · {SHORT_DATE_FORMATTER.format(summary.nextDueTask.dueDate)}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/75 px-4 py-3 text-xs text-slate-400">
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
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-900/80 text-xs font-semibold text-white"
                          style={{ backgroundColor: member.avatar_color ?? DEFAULT_AVATAR_COLOR }}
                        >
                          {getInitials(member)}
                        </span>
                      ))}
                    </div>
                    {summary.project.members && summary.project.members.length > 4 ? (
                      <span className="text-xs text-slate-400">
                        +{summary.project.members.length - 4}
                      </span>
                    ) : null}
                    {(!summary.project.members || summary.project.members.length === 0) && (
                      <span className="text-xs text-slate-500">No members yet</span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-300 transition group-hover:text-blue-200">
                    View board
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>

                <div className="mt-4 text-xs text-slate-500">
                  Updated {formatUpdatedAt(summary.project.updated_at ?? summary.project.created_at)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-800/70 bg-slate-900/75 px-5 py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Upcoming due dates</h2>
              <p className="text-sm text-slate-400">The next tasks scheduled across all workflows.</p>
            </div>
            <CalendarClock className="h-5 w-5 text-blue-300" />
          </div>

          {upcomingTasks.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">
              No upcoming due dates. Assign due dates to tasks to see them here.
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {upcomingTasks.map(({ task, dueDate }) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/85 px-4 py-3 text-sm text-white transition hover:border-blue-500/40 hover:bg-slate-900"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{task.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {task.stage?.name ?? "Stage"} · {SHORT_DATE_FORMATTER.format(dueDate)} · {formatRelativeToToday(dueDate)}
                    </p>
                  </div>
                  <Link
                    to={`/projects/${task.project_id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-300 transition hover:text-blue-200"
                  >
                    View
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-slate-800/70 bg-slate-900/75 px-5 py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Overdue tasks</h2>
              <p className="text-sm text-slate-400">Tasks that need attention across every project.</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-red-300" />
          </div>

          {overdueTasks.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">
              Great news! Nothing is overdue right now.
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {overdueTasks.map(({ task, dueDate }) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/85 px-4 py-3 text-sm text-white transition hover:border-red-500/40 hover:bg-slate-900"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{task.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {task.stage?.name ?? "Stage"} · {SHORT_DATE_FORMATTER.format(dueDate)} · {formatRelativeToToday(dueDate)}
                    </p>
                  </div>
                  <Link
                    to={`/projects/${task.project_id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-300 transition hover:text-blue-200"
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
