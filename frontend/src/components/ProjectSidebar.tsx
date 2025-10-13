import { useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  Settings,
  ArrowLeft,
  ClipboardList,
  ListTodo,
  Gauge,
} from "lucide-react";
import { useQuery } from "@apollo/client";
import { GET_PROJECT } from "../graphql";
import {
  Button,
  ScrollArea,
  Separator,
} from "./ui";
import { cn } from "../lib/utils";
import { getNavItemHighlightClasses } from "../lib/navigation";

interface ProjectSidebarProps {
  projectId: string;
}

export function ProjectSidebar({ projectId }: ProjectSidebarProps) {
  const navigate = useNavigate();
  const { data } = useQuery(GET_PROJECT, {
    variables: { id: projectId },
    skip: !projectId,
    fetchPolicy: "cache-first",
  });

  const projectName = data?.project?.name ?? "Project";
  const teamId = data?.project?.team?.id ?? null;

  const navItems = useMemo(
    () => [
      {
        to: `/projects/${projectId}`,
        label: "Overview",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        to: `/projects/${projectId}/workflow`,
        label: "Workflow",
        icon: KanbanSquare,
      },
      {
        to: `/projects/${projectId}/work-items`,
        label: "Work items",
        icon: ClipboardList,
      },
      {
        to: `/projects/${projectId}/backlog`,
        label: "Backlog",
        icon: ListTodo,
      },
      {
        to: `/projects/${projectId}/sprints`,
        label: "Sprints",
        icon: Gauge,
      },
      {
        to: `/projects/${projectId}/members`,
        label: "Members",
        icon: Users,
        disabled: true,
      },
      {
        to: `/projects/${projectId}/settings`,
        label: "Settings",
        icon: Settings,
        disabled: true,
      },
    ],
    [projectId]
  );

  return (
    <aside className="hidden w-72 flex-none border-r border-border bg-[hsl(var(--sidebar-background))] md:flex md:flex-col">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Project
          </p>
          <p className="truncate text-sm font-medium text-foreground">{projectName}</p>
        </div>
        {teamId ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8 rounded-full border-border"
            onClick={() => navigate(`/teams/${teamId}`)}
            aria-label="Back to team"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <Separator className="opacity-60" />

      <ScrollArea className="flex-1 px-4 py-4">
        <nav className="space-y-1">
          {navItems.map(({ to, label, icon: Icon, disabled, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={Boolean(exact)}
              className={({ isActive }) =>
                getNavItemHighlightClasses({
                  isActive,
                  className: cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-blue-500/10 hover:text-blue-600 dark:hover:bg-white/10 dark:hover:text-primary",
                    disabled && "cursor-not-allowed opacity-60"
                  ),
                })
              }
              onClick={(event) => {
                if (disabled) {
                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
              aria-disabled={disabled}
              tabIndex={disabled ? -1 : 0}
            >
              <Icon className="h-4 w-4 opacity-80" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
