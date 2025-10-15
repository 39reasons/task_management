import { useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client";
import type { AuthUser, Team as TeamType, Project as ProjectType } from "@shared/types";
import { Badge, Button, Separator, Alert, AlertTitle, AlertDescription } from "../components/ui";
import { Settings } from "lucide-react";
import { GET_TEAM } from "../graphql";
import { useTeamContext } from "../providers/TeamProvider";
import { useEnsureTeamInCache } from "../hooks/useEnsureTeamInCache";
import { useTeamMembershipActions } from "../hooks/useTeamMembershipActions";
import { TeamProjectsCard } from "../components/team/TeamProjectsCard";
import { TeamMembersCard } from "../components/team/TeamMembersCard";

interface TeamPageProps {
  user: AuthUser | null;
}

type TeamQueryResult = {
  team: TeamType | null;
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

export function TeamPage({ user }: TeamPageProps) {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { teams, refetchTeams, loadingTeams } = useTeamContext();

  useEnsureTeamInCache({ teamId, teams, loadingTeams, refetchTeams });

  const { data, loading, error, refetch } = useQuery<TeamQueryResult>(GET_TEAM, {
    variables: { id: teamId as string },
    skip: !teamId,
    fetchPolicy: "network-only",
  });

  const team = data?.team ?? null;

  const { handleLeaveTeam, handleRemoveMember, removingMemberId, leavingTeam, teamActionError } =
    useTeamMembershipActions({
      teamId,
      team,
      refetchTeam: () => refetch(),
      refetchTeams,
      onLeaveSuccess: () => navigate("/"),
    });

  const handleOpenProject = useCallback(
    (project: ProjectType) => {
      if (!project.id) return;
      navigate(`/projects/${project.id}`);
    },
    [navigate]
  );

  if (!teamId) {
    return <div className="p-6 text-destructive">Team identifier is missing.</div>;
  }

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading team details…</div>;
  }

  if (error) {
    return <div className="p-6 text-destructive">Unable to load team: {error.message}</div>;
  }

  if (!team) {
    return <div className="p-6 text-destructive">We couldn&apos;t find that team.</div>;
  }

  const projects = team.projects ?? [];
  const canManageTeam = Boolean(user && team.role === "owner");
  const viewerId = user?.id ?? null;

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-3xl border border-border bg-card px-6 py-6 shadow-lg shadow-slate-950/5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="uppercase">
              Team
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{team.name}</h1>
            {team.description ? (
              <p className="max-w-2xl text-sm text-muted-foreground">{team.description}</p>
            ) : (
              <p className="max-w-2xl text-sm text-muted-foreground">
                Add a description so teammates know how this team collaborates.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                Created {formatDate(team.created_at)} · Updated {formatDate(team.updated_at)}
              </span>
              <Separator orientation="vertical" className="hidden h-4 lg:flex" />
              <span>Slug: {team.slug}</span>
              {team.role ? (
                <Badge variant="outline" className="text-xs uppercase">
                  {team.role}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="flex items-start justify-end gap-2">
            {viewerId ? (
              <Button
                type="button"
                variant="ghost"
                className="gap-2 text-destructive hover:text-destructive focus:text-destructive"
                onClick={() => void handleLeaveTeam()}
                disabled={leavingTeam}
              >
                {leavingTeam ? "Leaving…" : "Leave team"}
              </Button>
            ) : null}
            {canManageTeam ? (
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => navigate(`/teams/${team.id}/settings`)}
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
                Edit team
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {teamActionError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to update membership</AlertTitle>
          <AlertDescription>{teamActionError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <TeamProjectsCard projects={projects} onOpenProject={handleOpenProject} formatDate={formatDate} />
        <TeamMembersCard
          members={team.members}
          viewerId={viewerId}
          canManageTeam={canManageTeam}
          leavingTeam={leavingTeam}
          removingMemberId={removingMemberId}
          onLeaveTeam={handleLeaveTeam}
          onRemoveMember={handleRemoveMember}
        />
      </div>
    </div>
  );
}

export default TeamPage;
