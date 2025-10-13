import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@apollo/client";
import type { AuthUser, Project } from "@shared/types";
import { Card, CardContent, Badge, Button, Avatar, AvatarFallback, Separator } from "../components/ui";
import { GET_PROJECT } from "../graphql";
import { Loader2, Users, Layers, CalendarDays, AlertCircle } from "lucide-react";
import { DEFAULT_AVATAR_COLOR } from "../constants/colors";
import { getInitials, getFullName } from "../utils/user";

interface ProjectHomePageProps {
  user: AuthUser | null;
  onInvite: (projectId: string) => void;
}

type ProjectQueryResult = {
  project: Project | null;
};

function formatDate(timestamp?: string | null): string {
  if (!timestamp) return "Not available";
  try {
    const formatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return formatter.format(new Date(timestamp));
  } catch {
    return "Not available";
  }
}

export function ProjectHomePage({ user, onInvite }: ProjectHomePageProps) {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? null;
  const navigate = useNavigate();

  const { data, loading, error } = useQuery<ProjectQueryResult>(GET_PROJECT, {
    variables: projectId ? { id: projectId } : undefined,
    skip: !projectId,
    fetchPolicy: "network-only",
  });

  if (!projectId) {
    return <div className="p-6 text-destructive">Project identifier is missing.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading project…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        Unable to load project: {error.message}
      </div>
    );
  }

  const project = data?.project;

  if (!project) {
    return <div className="p-6 text-destructive">We couldn&apos;t find that project.</div>;
  }

  const workflows = project.workflows ?? [];
  const stagesCount = workflows.reduce((acc, workflow) => acc + (workflow?.stages?.length ?? 0), 0);
  const members = project.members ?? [];
  const canManageProject = Boolean(
    user && project.viewer_role && (project.viewer_role === "owner" || project.viewer_role === "admin")
  );

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-3xl border border-border bg-card px-6 py-6 shadow-lg shadow-slate-950/5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="uppercase">
              Project
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{project.name}</h1>
            {project.description ? (
              <p className="max-w-3xl text-sm text-muted-foreground">{project.description}</p>
            ) : (
              <p className="max-w-3xl text-sm text-muted-foreground">
                Add a description so teammates know the scope and goals of this project.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                Created {formatDate(project.created_at)} · Updated {formatDate(project.updated_at)}
              </span>
              <Separator orientation="vertical" className="hidden h-4 lg:flex" />
              <span>{project.is_public ? "Public project" : "Private project"}</span>
              {project.team ? (
                <>
                  <Separator orientation="vertical" className="hidden h-4 lg:flex" />
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() => navigate(`/teams/${project.team?.id}`)}
                  >
                    {project.team?.name}
                  </button>
                </>
              ) : null}
            </div>
          </div>
          {canManageProject ? (
            <div className="flex items-start justify-end">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => onInvite(projectId)}
              >
                <Users className="h-4 w-4" />
                Invite teammates
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col gap-3 py-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
              <Layers className="h-5 w-5" />
            </span>
            <div>
              <p className="text-3xl font-semibold text-foreground">{workflows.length}</p>
              <p className="text-sm text-muted-foreground">Workflows</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {stagesCount} total stages configured across all workflows.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-3 py-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="text-3xl font-semibold text-foreground">{members.length}</p>
              <p className="text-sm text-muted-foreground">Collaborators</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {canManageProject
                ? "Invite teammates to collaborate on tasks and workflows."
                : "Reach out to project owners for access changes."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-3 py-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-500/10 text-slate-600">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <p className="text-3xl font-semibold text-foreground">{formatDate(project.updated_at)}</p>
              <p className="text-sm text-muted-foreground">Last updated</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Track workflow changes and new activity from the workflow board.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-3xl border border-border bg-card px-6 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Project collaborators</h2>
            <p className="text-sm text-muted-foreground">
              Manage who can access this project and what they can do.
            </p>
          </div>
          {canManageProject ? (
            <Button type="button" variant="ghost" className="gap-2" onClick={() => onInvite(projectId)}>
              <Users className="h-4 w-4" />
              Invite
            </Button>
          ) : null}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {members.length > 0 ? (
            members.map((member, index) => (
              <Card key={member?.id ?? member?.username ?? `member-${index}`} className="border-border">
                <CardContent className="flex items-center gap-3 py-4">
                  <Avatar className="h-10 w-10 border border-border/60 shadow-sm">
                    <AvatarFallback
                      className="text-sm font-semibold uppercase text-primary-foreground"
                      style={{ backgroundColor: member?.avatar_color ?? DEFAULT_AVATAR_COLOR }}
                    >
                      {getInitials(member)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{getFullName(member)}</p>
                    <p className="text-xs text-muted-foreground">@{member?.username}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              No collaborators yet. Invite teammates to get started.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
