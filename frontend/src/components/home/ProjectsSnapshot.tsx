interface ProjectsSnapshotProps {
  totals: {
    totalProjects: number;
    publicProjects: number;
    privateProjects: number;
    totalTeams: number;
    totalMembers: number;
  };
}

export function ProjectsSnapshot({ totals }: ProjectsSnapshotProps) {
  return (
    <div className="rounded-3xl border border-border/80 bg-slate-50 px-6 py-5 text-slate-900 shadow-lg shadow-slate-950/10 transition dark:border-white/10 dark:bg-white/10 dark:text-primary">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-900 dark:text-primary/80">
        Projects snapshot
      </p>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-primary">
        {totals.totalProjects}
      </p>
      <p className="text-sm text-slate-600 dark:text-primary/75">
        projects spanning {totals.totalTeams} teams
      </p>
      <div className="mt-4 grid gap-2 rounded-xl border border-dashed border-border bg-muted/50 p-4 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Visibility</span>
          <span className="text-sm font-semibold text-foreground">
            {totals.publicProjects} public · {totals.privateProjects} private
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Collaborators</span>
          <span className="text-sm font-semibold text-foreground">{totals.totalMembers}</span>
        </div>
      </div>
    </div>
  );
}

export default ProjectsSnapshot;
