import type { Project } from "@shared/types";
import { useCallback } from "react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "../ui";

interface ProjectCardProps {
  project: Project;
  onOpenProject: (projectId: string) => void;
  onInvite?: (projectId: string) => void;
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "Not available";
  }
  try {
    const formatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return formatter.format(new Date(value));
  } catch {
    return "Not available";
  }
}

export function ProjectCard({ project, onOpenProject, onInvite }: ProjectCardProps) {
  const teams = project.teams ?? [];
  const members = project.members ?? [];

  const handleClick = useCallback(() => {
    onOpenProject(project.id);
  }, [onOpenProject, project.id]);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleClick();
        }
      }}
      className="border-border/70 bg-card/80 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">{project.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {project.description ?? "Add a description to share the project focus."}
            </p>
          </div>
          <Badge
            variant={project.is_public ? "outline" : "secondary"}
            className={project.is_public ? "text-xs uppercase" : "text-xs uppercase"}
          >
            {project.is_public ? "Public" : "Private"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid gap-2 rounded-lg border border-dashed border-border/70 bg-muted/40 p-3 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Teams</span>
            <span className="text-sm font-semibold text-foreground">{teams.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Collaborators</span>
            <span className="text-sm font-semibold text-foreground">{members.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Updated</span>
            <span className="text-sm font-semibold text-foreground">{formatDate(project.updated_at)}</span>
          </div>
        </div>
        {onInvite ? (
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={(event) => {
                event.stopPropagation();
                onInvite(project.id);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onInvite(project.id);
                }
              }}
            >
              Invite teammates
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default ProjectCard;
