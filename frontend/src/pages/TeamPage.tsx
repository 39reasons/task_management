import { useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client";
import type { AuthUser, Team as TeamType, Project as ProjectType } from "@shared/types";
import {
  Badge,
  Button,
  Separator,
  Alert,
  AlertTitle,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Switch,
  Textarea,
} from "../components/ui";
import { Loader2, Settings } from "lucide-react";
import { ADD_PROJECT, GET_TEAM } from "../graphql";
import { useTeamContext } from "../providers/TeamProvider";
import { useEnsureTeamInCache } from "../hooks/useEnsureTeamInCache";
import { useTeamMembershipActions } from "../hooks/useTeamMembershipActions";
import { TeamProjectsCard } from "../components/team/TeamProjectsCard";
import { TeamMembersCard } from "../components/team/TeamMembersCard";
import { DESCRIPTION_MAX_LENGTH, NAME_MAX_LENGTH } from "../hooks/useProjectSettingsDialog";

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
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [createProjectName, setCreateProjectName] = useState("");
  const [createProjectDescription, setCreateProjectDescription] = useState("");
  const [createProjectIsPublic, setCreateProjectIsPublic] = useState(false);
  const [createProjectError, setCreateProjectError] = useState<string | null>(null);
  const [createProjectMutation, { loading: creatingProject }] = useMutation(ADD_PROJECT);

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

  const resetCreateProjectState = useCallback(() => {
    setCreateProjectName("");
    setCreateProjectDescription("");
    setCreateProjectIsPublic(false);
    setCreateProjectError(null);
  }, []);

  const handleCloseCreateProject = useCallback(() => {
    setIsCreateProjectOpen(false);
    resetCreateProjectState();
  }, [resetCreateProjectState]);

  const handleSubmitCreateProject = useCallback(async () => {
    if (!teamId) return;
    const trimmedName = createProjectName.trim();
    const trimmedDescription = createProjectDescription.trim();

    if (!trimmedName) {
      setCreateProjectError("Project name is required.");
      return;
    }

    if (trimmedName.length > NAME_MAX_LENGTH) {
      setCreateProjectError(`Project name cannot exceed ${NAME_MAX_LENGTH} characters.`);
      return;
    }

    if (trimmedDescription.length > DESCRIPTION_MAX_LENGTH) {
      setCreateProjectError(`Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters.`);
      return;
    }

    setCreateProjectError(null);

    try {
      await createProjectMutation({
        variables: {
          team_id: teamId,
          name: trimmedName,
          description: trimmedDescription || null,
          is_public: createProjectIsPublic,
        },
      });

      await Promise.all([refetch(), refetchTeams()]);
      handleCloseCreateProject();
    } catch (mutationError) {
      setCreateProjectError((mutationError as Error).message ?? "Unable to create project.");
    }
  }, [
    createProjectDescription,
    createProjectIsPublic,
    createProjectMutation,
    createProjectName,
    handleCloseCreateProject,
    refetch,
    refetchTeams,
    teamId,
  ]);

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
  const canCreateProject = Boolean(user && (team.role === "owner" || team.role === "admin"));
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
        <TeamProjectsCard
          projects={projects}
          onOpenProject={handleOpenProject}
          formatDate={formatDate}
          canCreateProject={canCreateProject}
          onCreateProject={() => {
            if (!canCreateProject) return;
            setCreateProjectError(null);
            setIsCreateProjectOpen(true);
          }}
          isCreatingProject={creatingProject}
        />
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

      <Dialog
        open={isCreateProjectOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsCreateProjectOpen(true);
            return;
          }
          handleCloseCreateProject();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create a new project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="team-project-name">Project name</Label>
              <Input
                id="team-project-name"
                value={createProjectName}
                onChange={(event) => setCreateProjectName(event.target.value)}
                placeholder="e.g. Website redesign"
                disabled={creatingProject}
                maxLength={NAME_MAX_LENGTH}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-project-description">Description</Label>
              <Textarea
                id="team-project-description"
                value={createProjectDescription}
                onChange={(event) => setCreateProjectDescription(event.target.value)}
                placeholder="Share what this project will focus on"
                disabled={creatingProject}
                maxLength={DESCRIPTION_MAX_LENGTH}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-muted/30 px-3 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Public project</p>
                <p className="text-xs text-muted-foreground">
                  Team members can discover and join public projects.
                </p>
              </div>
              <Switch
                id="team-project-public"
                checked={createProjectIsPublic}
                onCheckedChange={(checked) => setCreateProjectIsPublic(Boolean(checked))}
                disabled={creatingProject}
              />
            </div>
            {createProjectError ? (
              <p className="text-sm text-destructive">{createProjectError}</p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button type="button" variant="outline" onClick={handleCloseCreateProject} disabled={creatingProject}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmitCreateProject()}
              disabled={creatingProject}
              className="gap-2"
            >
              {creatingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {creatingProject ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TeamPage;
