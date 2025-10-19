import { useParams } from "react-router-dom";
import { useQuery } from "@apollo/client";
import type { AuthUser, Project } from "@shared/types";
import { Badge, Separator, Avatar, AvatarFallback } from "../components/ui";
import { GET_PROJECT } from "../graphql";
import { Loader2, AlertCircle } from "lucide-react";
import { getFullName, getInitials } from "../utils/user";
import { DEFAULT_AVATAR_COLOR } from "../constants/colors";

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

export function ProjectHomePage({}: ProjectHomePageProps) {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? null;

  const { data, loading, error } = useQuery<ProjectQueryResult>(GET_PROJECT, {
    variables: projectId ? { id: projectId } : undefined,
    skip: !projectId,
    fetchPolicy: "network-only",
  });

  const project = data?.project ?? null;
  const primaryTeam = project?.teams?.[0] ?? null;
  const owner =
    project?.members?.find((member) => member?.id && member.id === project.created_by) ?? null;
  const ownerName =
    owner ? getFullName(owner) || (owner.username ? `@${owner.username}` : null) : null;
  const ownerDisplayName = ownerName ?? "Project owner";
  const ownerInitials = owner ? getInitials(owner) || "?" : null;
  const ownerColor = owner?.avatar_color ?? DEFAULT_AVATAR_COLOR;

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

  if (!project) {
    return <div className="p-6 text-destructive">We couldn&apos;t find that project.</div>;
  }

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
                Created {formatDate(project.created_at)}
              </span>
              <Separator orientation="vertical" className="hidden h-4 lg:flex" />
              <span>{project.is_public ? "Public project" : "Private project"}</span>
              {primaryTeam ? (
                <>
                  <Separator orientation="vertical" className="hidden h-4 lg:flex" />
                  <span className="text-xs font-medium text-foreground">{primaryTeam.name}</span>
                </>
              ) : (
                <>
                  <Separator orientation="vertical" className="hidden h-4 lg:flex" />
                  <span>No teams yet</span>
                </>
              )}
              {owner ? (
                <>
                  <Separator orientation="vertical" className="hidden h-4 lg:flex" />
                  <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Owner</span>
                    <Avatar className="h-6 w-6 border border-border/60 shadow-sm">
                      <AvatarFallback
                        className="text-[11px] font-semibold uppercase text-primary-foreground"
                        style={{ backgroundColor: ownerColor }}
                      >
                        {ownerInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">{ownerDisplayName}</span>
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
