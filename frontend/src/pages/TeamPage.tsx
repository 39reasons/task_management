import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client";
import type { AuthUser, Team as TeamType, Project as ProjectType } from "@shared/types";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from "../components/ui";
import { Settings } from "lucide-react";
import { GET_TEAM } from "../graphql";
import { useTeamContext } from "../providers/TeamProvider";
import { DEFAULT_AVATAR_COLOR } from "../constants/colors";
import { getFullName, getInitials } from "../utils/user";

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
  const hasRequestedRefetch = useRef(false);

  useEffect(() => {
    if (!teamId || loadingTeams || hasRequestedRefetch.current) {
      return;
    }
    const found = teams.some((team) => team.id === teamId);
    if (!found) {
      hasRequestedRefetch.current = true;
      void refetchTeams().catch(() => {});
    }
  }, [teamId, teams, refetchTeams, loadingTeams]);

  const { data, loading, error } = useQuery<TeamQueryResult>(GET_TEAM, {
    variables: { id: teamId as string },
    skip: !teamId,
    fetchPolicy: "network-only",
  });

  if (!teamId) {
    return <div className="p-6 text-destructive">Team identifier is missing.</div>;
  }

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading team details…</div>;
  }

  if (error) {
    return <div className="p-6 text-destructive">Unable to load team: {error.message}</div>;
  }

  const team = data?.team;

  if (!team) {
    return <div className="p-6 text-destructive">We couldn&apos;t find that team.</div>;
  }

  const projects = team.projects ?? [];
  const canManageTeam = Boolean(user && team.role === "owner");

  const handleOpenProject = (project: ProjectType) => {
    if (!project.id) return;
    navigate(`/projects/${project.id}`);
  };

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
          {canManageTeam ? (
            <div className="flex items-start justify-end">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => navigate(`/teams/${team.id}/settings`)}
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
                Edit team
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="border-border/80" id="team-projects">
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/70 px-4 py-6 text-sm text-muted-foreground">
                No projects yet. Use the sidebar to create one and kick off your first workflow.
              </div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenProject(project)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOpenProject(project);
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
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80" id="team-members">
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {team.members && team.members.length > 0 ? (
              team.members.map((member) => {
                const memberUser = member.user;
                const memberName = getFullName(memberUser);
                const statusLabel = member.status === "active" ? "Active" : member.status === "invited" ? "Invited" : "Removed";
                return (
                  <div
                    key={`${member.team_id}-${memberUser.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/40 px-3 py-3"
                  >
                    <Avatar className="h-10 w-10 border border-border/70">
                      <AvatarFallback
                        className="text-sm font-semibold text-primary"
                        style={{ backgroundColor: memberUser.avatar_color || DEFAULT_AVATAR_COLOR }}
                      >
                        {getInitials(memberUser)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">
                        {memberName || memberUser.username}
                      </span>
                      <span className="text-xs text-muted-foreground">@{memberUser.username}</span>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <Badge variant="outline" className="text-[11px] uppercase tracking-wide">
                        {member.role}
                      </Badge>
                      <Badge
                        variant={member.status === "active" ? "secondary" : "outline"}
                        className="text-[10px] uppercase tracking-wide"
                      >
                        {statusLabel}
                      </Badge>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/70 px-4 py-6 text-sm text-muted-foreground">
                No members found for this team.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default TeamPage;
