import { useMemo, useState, useCallback } from "react";
import { useMutation } from "@apollo/client";
import { FolderOpen, Sparkles, Users } from "lucide-react";
import type { AuthUser, Team, Task } from "@shared/types";
import { useTeamContext } from "../providers/TeamProvider";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { LEAVE_TEAM } from "../graphql";
import { useNavigate } from "react-router-dom";

interface HomePageProps {
  user: AuthUser | null;
  setSelectedTask: (task: Task) => void;
}

interface TeamsSnapshotProps {
  totals: {
    totalTeams: number;
    totalProjects: number;
    publicProjects: number;
    privateProjects: number;
    totalMembers: number;
  };
}

function TeamsSnapshot({ totals }: TeamsSnapshotProps) {
  return (
    <div className="rounded-3xl border border-border/80 bg-slate-50 px-6 py-5 text-slate-900 shadow-lg shadow-slate-950/10 transition dark:border-white/10 dark:bg-white/10 dark:text-primary">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-900 dark:text-primary/80">
        Teams snapshot
      </p>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-primary">
        {totals.totalTeams}
      </p>
      <p className="text-sm text-slate-600 dark:text-primary/75">
        teams collaborating on {totals.totalProjects} projects
      </p>
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

function formatRole(role: Team["role"] | null | undefined): string {
  if (!role) return "Member";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatUpdatedAt(timestamp?: string | null): string {
  if (!timestamp) return "recently";
  const formatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
  return formatter.format(new Date(timestamp));
}

export function HomePage({ user }: HomePageProps) {
  const { teams, loadingTeams, refetchTeams } = useTeamContext();
  const [leaveTeamMutation] = useMutation(LEAVE_TEAM);
  const [leavingTeamId, setLeavingTeamId] = useState<string | null>(null);
  const [leaveTeamError, setLeaveTeamError] = useState<string | null>(null);
  const navigate = useNavigate();

  const { totals, teamCards } = useMemo(() => {
    const aggregates = {
      totalTeams: teams.length,
      totalProjects: 0,
      publicProjects: 0,
      privateProjects: 0,
      memberIds: new Set<string>(),
    };

    const cards = teams.map((team) => {
      const projects = team.projects ?? [];
      const members = team.members ?? [];
      const projectCount = projects.length;
      const publicProjects = projects.filter((project) => project.is_public).length;
      const privateProjects = projectCount - publicProjects;

      const teamMemberIds = new Set<string>();
      for (const member of members) {
        const memberId = member?.user?.id;
        if (memberId) {
          teamMemberIds.add(memberId);
          aggregates.memberIds.add(memberId);
        }
      }

      aggregates.totalProjects += projectCount;
      aggregates.publicProjects += publicProjects;
      aggregates.privateProjects += privateProjects;

      return {
        team,
        projectCount,
        publicProjects,
        privateProjects,
        memberCount: teamMemberIds.size,
      };
    });

    return {
      totals: {
        totalTeams: aggregates.totalTeams,
        totalProjects: aggregates.totalProjects,
        publicProjects: aggregates.publicProjects,
        privateProjects: aggregates.privateProjects,
        totalMembers: aggregates.memberIds.size,
      },
      teamCards: cards,
    };
  }, [teams]);

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

      setLeaveTeamError(null);
      setLeavingTeamId(team.id);
      try {
        await leaveTeamMutation({ variables: { team_id: team.id } });
        await refetchTeams();
      } catch (error) {
        setLeaveTeamError((error as Error).message ?? "Unable to leave team.");
      } finally {
        setLeavingTeamId(null);
      }
    },
    [leaveTeamMutation, refetchTeams]
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
              Teams bring your projects, workflows, and teammates together. Keep track of ownership, membership, and
              visibility before diving into the work itself.
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
            {teamCards.map(({ team, projectCount, publicProjects, privateProjects, memberCount }) => (
              <div
                key={team.id}
                role="button"
                tabIndex={0}
                aria-label={`Open team ${team.name}`}
                onClick={() => handleOpenTeam(team)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleOpenTeam(team);
                  }
                }}
                className="flex flex-col rounded-2xl border border-border bg-card/60 p-6 outline-none transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{formatRole(team.role)}</p>
                    <h3 className="mt-2 text-lg font-semibold text-foreground">{team.name}</h3>
                    {team.description ? (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{team.description}</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 grid gap-3 rounded-xl border border-dashed border-border bg-muted/60 p-4 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Projects</span>
                    <span className="text-sm font-semibold text-foreground">{projectCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Visibility</span>
                    <span className="text-sm font-semibold text-foreground">
                      {publicProjects} public · {privateProjects} private
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Members</span>
                    <span className="text-sm font-semibold text-foreground">{memberCount}</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {team.role !== "owner" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-destructive hover:text-destructive focus:text-destructive"
                      disabled={leavingTeamId === team.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleLeaveTeam(team);
                      }}
                    >
                      Leave team
                    </Button>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    Updated {team.updated_at ? formatUpdatedAt(team.updated_at) : "recently"}
                  </span>
                </div>
              </div>
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
