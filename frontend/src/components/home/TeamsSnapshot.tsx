interface TeamsSnapshotProps {
  totals: {
    totalTeams: number;
    totalProjects: number;
    publicProjects: number;
    privateProjects: number;
    totalMembers: number;
  };
}

export function TeamsSnapshot({ totals }: TeamsSnapshotProps) {
  return (
    <div className="rounded-3xl border border-border/80 bg-slate-50 px-6 py-5 text-slate-900 shadow-lg shadow-slate-950/10 transition dark:border-white/10 dark:bg-white/10 dark:text-primary">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-900 dark:text-primary/80">Teams snapshot</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-primary">{totals.totalTeams}</p>
      <p className="text-sm text-slate-600 dark:text-primary/75">teams collaborating on {totals.totalProjects} projects</p>
      <div className="mt-4 grid gap-2 rounded-xl border border-dashed border-border bg-muted/50 p-4 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Projects</span>
          <span className="text-sm font-semibold text-foreground">
            {totals.publicProjects} public · {totals.privateProjects} private
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Teammates</span>
          <span className="text-sm font-semibold text-foreground">{totals.totalMembers}</span>
        </div>
      </div>
    </div>
  );
}
