import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Plus, Home, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMutation, useQuery } from "@apollo/client";
import type { AuthUser, Project } from "@shared/types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ScrollArea,
  Separator,
  Textarea,
} from "../ui";
import { CREATE_TEAM, GET_PROJECTS } from "../../graphql";
import { useTeamContext } from "../../providers/TeamProvider";
import { getNavItemHighlightClasses } from "../../lib/navigation";

interface SidebarProps {
  user: AuthUser | null;
}

interface SidebarLinkProps {
  to: string;
  icon: LucideIcon;
  label: string;
  exact?: boolean;
}

function SidebarLink({ to, icon: Icon, label, exact = false }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        getNavItemHighlightClasses({
          isActive,
          className:
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-blue-500/10 hover:text-blue-600 dark:hover:bg-white/10 dark:hover:text-primary",
        })
      }
    >
      <Icon className="h-4 w-4 opacity-80" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ user }: SidebarProps) {
  const { teams, loadingTeams, refetchTeams } = useTeamContext();
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [teamSubmitting, setTeamSubmitting] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [createTeamMutation] = useMutation(CREATE_TEAM);
  const { data: projectsData, loading: loadingProjects } = useQuery<{ projects: Project[] }>(GET_PROJECTS, {
    skip: !user,
    fetchPolicy: "cache-first",
  });

  const projects = useMemo<Project[]>(() => projectsData?.projects ?? [], [projectsData?.projects]);

  const sortedTeams = useMemo(() => {
    return teams.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [teams]);

  useEffect(() => {
    if (!showCreateTeam) {
      return;
    }
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId, showCreateTeam]);

  const handleCreateTeam = async () => {
    const trimmed = teamName.trim();
    if (!trimmed) {
      setTeamError("Team name is required.");
      return;
    }
    if (!selectedProjectId) {
      setTeamError("Select a project for this team.");
      return;
    }

    setTeamSubmitting(true);
    setTeamError(null);
    try {
      const response = await createTeamMutation({
        variables: {
          project_id: selectedProjectId,
          name: trimmed,
          description: teamDescription.trim() || null,
        },
      });
      await refetchTeams();
      const createdTeam = response.data?.createTeam ?? null;
      setShowCreateTeam(false);
      setTeamName("");
      setTeamDescription("");
      setSelectedProjectId(null);
      if (createdTeam?.id) {
        const destination = createdTeam.project_id
          ? `/projects/${createdTeam.project_id}/teams/${createdTeam.id}`
          : "/";
        navigate(destination);
      }
    } catch (error) {
      setTeamError((error as Error).message ?? "Unable to create team.");
    } finally {
      setTeamSubmitting(false);
    }
  };

  return (
    <aside className="hidden w-72 flex-none border-r border-border bg-[hsl(var(--sidebar-background))] md:flex md:flex-col">
      <div className="flex items-center justify-between px-4 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Teams</p>
          <p className="text-sm font-medium text-foreground">Manage and explore</p>
        </div>
        {user ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8 rounded-full border-border"
            onClick={() => {
              setShowCreateTeam(true);
              setTeamError(null);
            }}
            aria-label="Create team"
          >
            <Plus className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <Separator className="opacity-60" />

      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Browse</p>
            <SidebarLink to="/" icon={Home} label="All teams" exact />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your teams</p>
              {loadingTeams ? (
                <span className="text-[11px] text-muted-foreground">Loading…</span>
              ) : null}
            </div>
            {sortedTeams.length === 0 && !loadingTeams ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                You do not belong to any teams yet.
              </p>
            ) : (
              <div className="space-y-1">
                {sortedTeams.map((team) => {
                  const destination = team.project_id
                    ? `/projects/${team.project_id}/teams/${team.id}`
                    : "/";
                  return (
                    <SidebarLink
                      key={team.id}
                      to={destination}
                      icon={Users}
                      label={team.name}
                      exact={false}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {!user ? (
        <div className="px-4 py-4">
          <Button asChild className="w-full justify-center gap-2">
            <NavLink to="/signin">
              <Users className="h-4 w-4" />
              Sign in
            </NavLink>
          </Button>
        </div>
      ) : null}

      <Dialog
        open={showCreateTeam}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateTeam(false);
            setTeamName("");
            setTeamDescription("");
            setSelectedProjectId(null);
            setTeamError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create a new team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sidebar-team-name">Team name</Label>
              <Input
                id="sidebar-team-name"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="e.g. Product design"
                disabled={teamSubmitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sidebar-team-project">Project</Label>
              <select
                id="sidebar-team-project"
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                value={selectedProjectId ?? ""}
                onChange={(event) => setSelectedProjectId(event.target.value || null)}
                disabled={teamSubmitting || loadingProjects || projects.length === 0}
                required
              >
                {projects.length === 0 ? (
                  <option value="" disabled>
                    {loadingProjects ? "Loading projects…" : "No projects available"}
                  </option>
                ) : null}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              {projects.length === 0 && !loadingProjects ? (
                <p className="text-xs text-muted-foreground">
                  Create a project first to add teams.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sidebar-team-description">Description</Label>
              <Textarea
                id="sidebar-team-description"
                value={teamDescription}
                onChange={(event) => setTeamDescription(event.target.value)}
                placeholder="What does this team focus on?"
                disabled={teamSubmitting}
              />
            </div>
            {teamError ? <p className="text-sm text-destructive">{teamError}</p> : null}
          </div>
          <DialogFooter className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateTeam(false);
                setTeamError(null);
              }}
              disabled={teamSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreateTeam()}
              disabled={teamSubmitting || projects.length === 0}
            >
              Create team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
