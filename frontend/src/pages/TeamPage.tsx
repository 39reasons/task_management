import { useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client";
import type { AuthUser, Team as TeamType } from "@shared/types";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from "../components/ui";
import { Loader2, Settings } from "lucide-react";
import { GET_TEAM } from "../graphql";
import { useTeamContext } from "../providers/TeamProvider";
import { useEnsureTeamInCache } from "../hooks/useEnsureTeamInCache";
import { useTeamMembershipActions } from "../hooks/useTeamMembershipActions";
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
    (projectId: string | null | undefined) => {
      if (!projectId) return;
      navigate(`/projects/${projectId}`);
    },
    [navigate]
  );

  if (!teamId) {
    return <div className="p-6 text-destructive">Team identifier is missing.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading team details…
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-destructive">Unable to load team: {error.message}</div>;
  }

  if (!team) {
    return <div className="p-6 text-destructive">We couldn&apos;t find that team.</div>;
  }

  const project = team.project ?? null;
  const boards = team.boards ?? [];
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
        <div className="space-y-6">
          <Card className="border-border/80" id="team-project">
            <CardHeader className="pb-4">
              <CardTitle>Project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project ? (
                <>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-foreground">{project.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {project.description ?? "No description provided."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{project.is_public ? "Public project" : "Private project"}</span>
                    <Separator orientation="vertical" className="hidden h-4 lg:flex" />
                    <span>Updated {formatDate(project.updated_at)}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => handleOpenProject(project.id)}
                  >
                    View project
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This team is not linked to a project yet. Create a project to unlock boards and workflows.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80" id="team-boards">
            <CardHeader className="pb-4">
              <CardTitle>Boards &amp; Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {boards.length > 0 ? (
                boards.map((board) => (
                  <div
                    key={board.id}
                    className="rounded-lg border border-border/70 bg-background/40 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{board.name}</p>
                      <span className="text-xs text-muted-foreground">
                        {(board.stages ?? []).length} stages
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 text-xs"
                      onClick={() => handleOpenProject(project?.id)}
                    >
                      Open board
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Boards for this team will appear here once configured.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

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
