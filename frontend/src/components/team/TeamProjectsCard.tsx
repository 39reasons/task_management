import type { Project as ProjectType } from "@shared/types";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "../ui";

interface TeamProjectsCardProps {
  projects: ProjectType[];
  onOpenProject: (project: ProjectType) => void;
  formatDate: (timestamp?: string | null) => string;
}

export function TeamProjectsCard({ projects, onOpenProject, formatDate }: TeamProjectsCardProps) {
  const hasProjects = projects.length > 0;

  return (
    <Card className="border-border/80" id="team-projects">
      <CardHeader>
        <CardTitle>Projects</CardTitle>
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
          <div className="rounded-xl border border-dashed border-border bg-muted/70 px-4 py-6 text-sm text-muted-foreground">
            No projects yet. Use the sidebar to create one and kick off your first workflow.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TeamProjectsCard;
