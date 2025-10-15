import { useCallback } from "react";
import { FolderOpen, Sparkles, Users } from "lucide-react";
import type { AuthUser, Team, Task } from "@shared/types";
import { useTeamContext } from "../providers/TeamProvider";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { useNavigate } from "react-router-dom";
import { useHomeTeamMetrics } from "../hooks/useHomeTeamMetrics";
import { useLeaveTeam } from "../hooks/useLeaveTeam";
import { TeamCard } from "../components/home/TeamCard";
import { TeamsSnapshot } from "../components/home/TeamsSnapshot";

interface HomePageProps {
  user: AuthUser | null;
  setSelectedTask: (task: Task) => void;
}

export function HomePage({ user }: HomePageProps) {
  const { teams, loadingTeams, refetchTeams } = useTeamContext();
  const navigate = useNavigate();
  const { totals, teamCards } = useHomeTeamMetrics(teams);
  const { leaveTeam, isLeaving, error: leaveTeamError } = useLeaveTeam(refetchTeams);

  const noTeams = !loadingTeams && teamCards.length === 0;

  const handleOpenTeam = useCallback(
    (team: Team) => {
      if (!team?.id) return;
      navigate(`/teams/${team.id}`);
    },
    [navigate]
  );

  const handleLeaveTeam = useCallback(
    async (team: Team) => {
      if (!team?.id) return;
      const confirmed = window.confirm(`Leave the team "${team.name}"?`);
      if (!confirmed) return;

      await leaveTeam(team);
    },
    [leaveTeam]
  );

  return (
    <div className="space-y-8 pb-6">
      <section className="rounded-3xl border border-border bg-card px-6 py-8 shadow-lg shadow-slate-950/5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              {user ? `Welcome back, ${user.first_name ?? user.username}!` : "Welcome to JellyFlow"}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {user ? "Choose a team to get started" : "Organize teams, projects, and workflows"}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Teams bring your projects, workflows, and teammates together. Keep track of ownership, membership, and visibility
              before diving into the work itself.
            </p>
          </div>
          <div className="w-full max-w-xs">
            {user ? (
              <TeamsSnapshot totals={totals} />
            ) : (
              <div className="rounded-3xl border border-dashed border-border px-6 py-5 text-center text-sm text-muted-foreground">
                Sign in to explore teams.
              </div>
            )}
          </div>
        </div>
      </section>

      {loadingTeams ? (
        <Alert>
          <AlertTitle>Loading teams…</AlertTitle>
          <AlertDescription>We’re fetching your teams. Hang tight!</AlertDescription>
        </Alert>
      ) : null}

      {leaveTeamError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to leave team</AlertTitle>
          <AlertDescription>{leaveTeamError}</AlertDescription>
        </Alert>
      ) : null}

      {user && noTeams ? (
        <div className="space-y-2">
          <Alert>
            <AlertTitle>No teams yet</AlertTitle>
            <AlertDescription>Create your first team from the sidebar to start collaborating.</AlertDescription>
          </Alert>
          <div className="rounded-2xl border border-dashed border-border bg-muted/70 px-6 py-8 text-center text-sm text-muted-foreground">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
              <FolderOpen className="h-6 w-6" />
            </div>
            <p className="mt-4 font-semibold text-foreground">Ready to spin up a team?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Open the sidebar and click “Create team” to invite collaborators and start planning.
            </p>
          </div>
        </div>
      ) : null}

      {teamCards.length > 0 ? (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Your teams</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {teamCards.map(({ team, ...metrics }) => (
              <TeamCard
                key={team.id}
                team={team}
                metrics={metrics}
                onOpenTeam={handleOpenTeam}
                onLeaveTeam={handleLeaveTeam}
                canLeave={team.role !== "owner"}
                isLeaving={isLeaving(team.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {user && teamCards.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#d2e2fb] text-[#1f6feb] transition dark:bg-blue-500/30 dark:text-blue-200">
                <Users className="h-5 w-5" />
              </span>
              <span className="text-xs text-muted-foreground">Teams</span>
            </div>
            <p className="mt-5 text-3xl font-semibold text-foreground">{totals.totalTeams}</p>
            <p className="text-sm text-muted-foreground">Active teams</p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <FolderOpen className="h-5 w-5" />
              </span>
              <span className="text-xs text-muted-foreground">
                {totals.publicProjects} public · {totals.privateProjects} private
              </span>
            </div>
            <p className="mt-5 text-3xl font-semibold text-foreground">{totals.totalProjects}</p>
            <p className="text-sm text-muted-foreground">Projects across teams</p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-600">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="text-xs text-muted-foreground">Collaborators</span>
            </div>
            <p className="mt-5 text-3xl font-semibold text-foreground">{totals.totalMembers}</p>
            <p className="text-sm text-muted-foreground">Unique teammates</p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="text-xs text-muted-foreground">Momentum</span>
            </div>
            <p className="mt-5 text-3xl font-semibold text-foreground">
              {totals.totalTeams > 0 ? (totals.totalProjects / totals.totalTeams).toFixed(1) : "0"}
            </p>
            <p className="text-sm text-muted-foreground">Projects per team (avg)</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
