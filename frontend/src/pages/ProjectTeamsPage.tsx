import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";
import type { Team } from "@shared/types";
import { GET_PROJECT, CREATE_TEAM, GET_TEAMS } from "../graphql";
import { Users as UsersIcon } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "../components/ui";
import { COLOR_WHEEL, DEFAULT_AVATAR_COLOR } from "../constants/colors";

interface TeamsQueryResult {
  project: {
    id: string;
    name: string;
    teams?: Team[];
  } | null;
}

export function ProjectTeamsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery<TeamsQueryResult>(GET_PROJECT, {
    variables: { id: projectId ?? "" },
    skip: !projectId,
    fetchPolicy: "network-only",
  });

  const [createTeamMutation, { loading: creatingTeam }] = useMutation(CREATE_TEAM);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamError, setTeamError] = useState<string | null>(null);

  const project = data?.project ?? null;
  const teams = useMemo(() => project?.teams ?? [], [project?.teams]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());

  const toggleTeamSelection = (teamId: string, checked: boolean) => {
    setSelectedTeamIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(teamId);
      } else {
        next.delete(teamId);
      }
      return next;
    });
  };

  const getTeamInitials = (name: string | null | undefined): string => {
    if (!name) return "?";
    const trimmed = name.trim();
    if (!trimmed) return "?";
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    if (words.length === 1) {
      const firstChar = words[0]?.[0] ?? "";
      return firstChar ? firstChar.toUpperCase() : "?";
    }
    return "?";
  };

  const teamColorMap = useMemo(() => {
    const palette = COLOR_WHEEL.length > 0 ? COLOR_WHEEL : [DEFAULT_AVATAR_COLOR];
    return (seed: string | null | undefined) => {
      if (!seed) return DEFAULT_AVATAR_COLOR;
      let hash = 0;
      for (const char of seed) {
        hash = (hash * 31 + char.charCodeAt(0)) % palette.length;
      }
      return palette[Math.abs(hash) % palette.length] ?? DEFAULT_AVATAR_COLOR;
    };
  }, []);

  const handleCreateTeam = async () => {
    if (!projectId) return;
    const trimmedName = teamName.trim();
    if (!trimmedName) {
      setTeamError("Team name is required.");
      return;
    }

    setTeamError(null);
    try {
      await createTeamMutation({
        variables: {
          project_id: projectId,
          name: trimmedName,
          description: teamDescription.trim() || null,
        },
        refetchQueries: [{ query: GET_PROJECT, variables: { id: projectId } }, { query: GET_TEAMS }],
      });

      setIsCreateTeamOpen(false);
      setTeamName("");
      setTeamDescription("");
      await refetch();
    } catch (mutationError) {
      setTeamError((mutationError as Error).message ?? "Unable to create team.");
    }
  };

  if (!projectId) {
    return <div className="p-6 text-destructive">Project identifier is missing.</div>;
  }

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading project teams…</div>;
  }

  if (error) {
    return <div className="p-6 text-destructive">Unable to load teams: {error.message}</div>;
  }

  if (!project) {
    return <div className="p-6 text-destructive">We couldn't find that project.</div>;
  }

  const hasTeams = teams.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Teams in {project.name}</h1>
          <p className="text-sm text-muted-foreground">
            Organize squads that collaborate within this project.
          </p>
        </div>
        <Button type="button" onClick={() => setIsCreateTeamOpen(true)} className="gap-2">
          Create team
        </Button>
      </div>

      {!hasTeams ? (
        <Alert>
          <AlertTitle>No teams yet</AlertTitle>
          <AlertDescription>Create your first team to structure collaboration inside this project.</AlertDescription>
        </Alert>
      ) : (
        <div className="rounded-none border border-border/60 bg-[#1f1f24] shadow-lg shadow-black/40">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[48px]">
                  <span className="sr-only">Select team</span>
                </TableHead>
                <TableHead className="w-[40%]">Team</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[140px]">Members</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => {
                const memberCount = team.members?.length ?? 0;
                return (
                  <TableRow key={team.id} className="transition hover:bg-blue-500/5">
                    <TableCell>
                      <Checkbox
                        className="border border-white/70 bg-transparent text-white focus-visible:ring-white/70 data-[state=checked]:border-white data-[state=checked]:bg-white/20 data-[state=checked]:text-white"
                        checked={selectedTeamIds.has(team.id)}
                        onCheckedChange={(checked) => toggleTeamSelection(team.id, Boolean(checked))}
                        aria-label={`Select ${team.name}`}
                      />
                    </TableCell>
                    <TableCell
                      className="cursor-pointer"
                      onClick={() => navigate(`/projects/${projectId}/teams/${team.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(`/projects/${projectId}/teams/${team.id}`);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold uppercase text-primary-foreground shadow-sm"
                          style={{ backgroundColor: teamColorMap(team.id ?? team.name ?? "") }}
                        >
                          {getTeamInitials(team.name)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">{team.name}</span>
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">Team</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {team.description ?? "No description provided."}
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                        <UsersIcon className="h-4 w-4 opacity-70" />
                        {memberCount}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={isCreateTeamOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateTeamOpen(false);
            setTeamName("");
            setTeamDescription("");
            setTeamError(null);
          } else {
            setIsCreateTeamOpen(true);
            setTeamError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create a team</DialogTitle>
            <DialogDescription>
              Teams allow smaller groups to coordinate on focused areas of the project. You can adjust details later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="project-team-name">Team name</Label>
              <Input
                id="project-team-name"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="e.g. Backend Platform"
                disabled={creatingTeam}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-team-description">Description</Label>
              <Textarea
                id="project-team-description"
                value={teamDescription}
                onChange={(event) => setTeamDescription(event.target.value)}
                placeholder="What does this team focus on?"
                disabled={creatingTeam}
              />
            </div>
            {teamError ? <p className="text-sm text-destructive">{teamError}</p> : null}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateTeamOpen(false);
                setTeamName("");
                setTeamDescription("");
                setTeamError(null);
              }}
              disabled={creatingTeam}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCreateTeam()} disabled={creatingTeam}>
              {creatingTeam ? "Creating…" : "Create team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProjectTeamsPage;
