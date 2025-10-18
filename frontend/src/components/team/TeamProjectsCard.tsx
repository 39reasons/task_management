import type { Project as ProjectType } from "@shared/types";
import { Loader2, Plus } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "../ui";

interface TeamProjectsCardProps {
  projects: ProjectType[];
  onOpenProject: (project: ProjectType) => void;
  formatDate: (timestamp?: string | null) => string;
  canCreateProject?: boolean;
  onCreateProject?: () => void;
  isCreatingProject?: boolean;
}

export function TeamProjectsCard({
  projects,
  onOpenProject,
  formatDate,
  canCreateProject = false,
  onCreateProject,
  isCreatingProject = false,
}: TeamProjectsCardProps) {
  const hasProjects = projects.length > 0;
  const disableCreateButton = !onCreateProject || isCreatingProject;

  return (
    <Card className="border-border/80" id="team-projects">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Projects</CardTitle>
        {canCreateProject ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={onCreateProject}
            disabled={disableCreateButton}
          >
            {isCreatingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {isCreatingProject ? "Creating…" : "New project"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {hasProjects ? (
          projects.map((project) => (
            <div
              key={project.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpenProject(project)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpenProject(project);
                }
              }}
              className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/70 p-4 transition hover:border-primary/40 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-foreground">{project.name}</p>
                  {project.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                  ) : (
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">No description</p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={
                    project.is_public
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200"
                      : ""
                  }
                >
                  {project.is_public ? "Public" : "Private"}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>Updated {formatDate(project.updated_at)}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-3 rounded-xl border border-dashed border-border bg-muted/70 px-4 py-6 text-sm text-muted-foreground">
            <p className="text-muted-foreground">No projects yet. Create one to kick off your first board.</p>
            {canCreateProject ? (
              <Button
                type="button"
                size="sm"
                className="w-fit gap-2"
                onClick={onCreateProject}
                disabled={disableCreateButton}
              >
                {isCreatingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isCreatingProject ? "Creating…" : "Create your first project"}
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TeamProjectsCard;
