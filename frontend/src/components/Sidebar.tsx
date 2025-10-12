import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { NavLink, useNavigate } from "react-router-dom";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import { DndContext, PointerSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AuthUser } from "@shared/types";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  ScrollArea,
  Separator,
  Switch,
  Textarea,
} from "./ui";
import { cn } from "../lib/utils";
import { getNavItemHighlightClasses } from "../lib/navigation";
import {
  GET_PROJECTS,
  ADD_PROJECT,
  REORDER_PROJECTS,
  CREATE_TEAM,
  GET_PROJECTS_OVERVIEW,
} from "../graphql";
import { useTeamContext } from "../providers/TeamProvider";

interface SidebarProps {
  user: AuthUser | null;
}

const NAME_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 600;

export default function Sidebar({ user }: SidebarProps) {
  const { activeTeamId, loadingTeams } = useTeamContext();

  const { data, loading } = useQuery(GET_PROJECTS, {
    variables: activeTeamId ? { team_id: activeTeamId } : undefined,
    skip: !activeTeamId,
    fetchPolicy: "network-only",
    errorPolicy: "all",
  });

  const projects = useMemo<SidebarContentProps["projects"]>(() => {
    if (!activeTeamId) {
      return [];
    }

    const rawProjects = (data?.projects ?? []) as Array<
      Partial<SidebarContentProps["projects"][number]> & {
        id: string;
        name: string;
        is_public: boolean;
        viewer_is_owner: boolean;
      }
    >;

    const normalized: SidebarProject[] = rawProjects.map((project) => ({
      id: project.id,
      team_id: project.team_id ?? activeTeamId,
      name: project.name ?? "Untitled project",
      description: project.description ?? null,
      is_public: Boolean(project.is_public),
      viewer_is_owner: Boolean(project.viewer_is_owner),
      viewer_role: project.viewer_role ?? null,
      position: project.position ?? null,
    }));

    return normalized
      .slice()
      .sort((a, b) => {
        const posA = a.position ?? Number.MAX_SAFE_INTEGER;
        const posB = b.position ?? Number.MAX_SAFE_INTEGER;
        if (posA !== posB) {
          return posA - posB;
        }
        return a.name.localeCompare(b.name);
      });
  }, [activeTeamId, data?.projects]);

  const isInitialLoading = (loadingTeams || (activeTeamId ? loading : false)) && projects.length === 0;

  if (isInitialLoading) {
    return (
      <aside className="hidden w-72 flex-none border-r border-border bg-[hsl(var(--sidebar-background))] md:flex">
        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
          Loading projects…
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden w-72 flex-none border-r border-border bg-[hsl(var(--sidebar-background))] md:flex md:flex-col">
      <SidebarContent user={user} projects={projects} projectsLoading={loading && !!activeTeamId} />
    </aside>
  );
}

interface SidebarContentProps {
  user: AuthUser | null;
  projects: Array<{
    id: string;
    team_id: string;
    name: string;
    description?: string | null;
    is_public: boolean;
    viewer_is_owner: boolean;
    viewer_role?: string | null;
    position?: number | null;
  }>;
  projectsLoading: boolean;
}

type SidebarProject = SidebarContentProps["projects"][number];

function SidebarContent({ user, projects, projectsLoading }: SidebarContentProps) {
  const { teams, activeTeamId, activeTeam, setActiveTeamId, loadingTeams, refetchTeams } = useTeamContext();
  const hasTeams = teams.length > 0;

  const [addProject] = useMutation(ADD_PROJECT, {
    refetchQueries:
      activeTeamId
        ? [
            { query: GET_PROJECTS, variables: { team_id: activeTeamId } },
            { query: GET_PROJECTS_OVERVIEW, variables: { team_id: activeTeamId } },
          ]
        : [],
  });
  const [reorderProjectsMutation] = useMutation(REORDER_PROJECTS, {
    refetchQueries:
      activeTeamId
        ? [{ query: GET_PROJECTS, variables: { team_id: activeTeamId } }]
        : [],
  });
  const [createTeamMutation] = useMutation(CREATE_TEAM);
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createPublic, setCreatePublic] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamSubmitting, setTeamSubmitting] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [orderedProjects, setOrderedProjects] = useState(projects);
  const [blockNavigation, setBlockNavigation] = useState(false);
  const unblockTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canManageProjects = Boolean(activeTeam && (activeTeam.role === "owner" || activeTeam.role === "admin"));
  const activeRoleLabel = activeTeam?.role
    ? `${activeTeam.role.charAt(0).toUpperCase()}${activeTeam.role.slice(1)}`
    : null;
  const showEmptyTeamsState = !loadingTeams && !hasTeams;
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  useEffect(() => {
    setOrderedProjects((previous) => {
      const projectMap = new Map(projects.map((project) => [project.id, project]));
      const next: SidebarContentProps["projects"] = [];

      for (const existing of previous) {
        const updated = projectMap.get(existing.id);
        if (updated) {
          next.push(updated);
          projectMap.delete(existing.id);
        }
      }

      projectMap.forEach((project) => {
        next.push(project);
      });

      return next;
    });
  }, [projects]);

  useEffect(() => {
    return () => {
      if (unblockTimeout.current) {
        clearTimeout(unblockTimeout.current);
        unblockTimeout.current = null;
      }
    };
  }, []);

  const handleCreate = async () => {
    if (!activeTeamId) {
      setCreateError("Select or create a team before creating a project.");
      return;
    }
    if (!canManageProjects) {
      setCreateError("You do not have permission to create projects in this team.");
      return;
    }
    const trimmedName = createName.trim();
    if (!trimmedName) {
      setCreateError("Project name is required.");
      return;
    }
    if (trimmedName.length > NAME_MAX_LENGTH) {
      setCreateError(`Project name cannot exceed ${NAME_MAX_LENGTH} characters.`);
      return;
    }
    if (createDescription.trim().length > DESCRIPTION_MAX_LENGTH) {
      setCreateError(`Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters.`);
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const { data: addProjectData } = await addProject({
        variables: {
          team_id: activeTeamId,
          name: trimmedName,
          description: createDescription.trim() || null,
          is_public: createPublic,
        },
      });
      setShowCreate(false);
      setCreateName("");
      setCreateDescription("");
      setCreatePublic(false);
      const newProject = addProjectData?.addProject;
      if (newProject?.id) {
        navigate(`/projects/${newProject.id}`);
      }
    } catch (error) {
      setCreateError((error as Error).message ?? "Unable to create project.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const persistOrder = useCallback(
    async (
      nextOrder: Array<SidebarContentProps["projects"][number]>,
      previousOrder: Array<SidebarContentProps["projects"][number]>
    ) => {
      if (!user || !activeTeamId || !canManageProjects) return;
      try {
        await reorderProjectsMutation({
          variables: {
            team_id: activeTeamId,
            project_ids: nextOrder.map((project) => project.id),
          },
        });
      } catch (error) {
        console.error("Failed to reorder projects", error);
        setOrderedProjects(previousOrder.slice());
      }
    },
    [activeTeamId, canManageProjects, reorderProjectsMutation, user]
  );

  const scheduleUnblockNavigation = useCallback(() => {
    if (unblockTimeout.current) {
      clearTimeout(unblockTimeout.current);
    }
    unblockTimeout.current = setTimeout(() => {
      setBlockNavigation(false);
      unblockTimeout.current = null;
    }, 150);
  }, []);

  const handleProjectDialogChange = useCallback(
    (open: boolean) => {
      if (open) {
        setCreateError(null);
        setShowCreate(true);
      } else if (!createSubmitting) {
        setShowCreate(false);
        setCreateError(null);
      }
    },
    [createSubmitting]
  );

  const resetTeamDialog = useCallback(() => {
    setTeamName("");
    setTeamDescription("");
    setTeamError(null);
    setShowCreateTeam(false);
  }, []);

  const handleCreateTeam = useCallback(async () => {
    const trimmedName = teamName.trim();
    if (!trimmedName) {
      setTeamError("Team name is required.");
      return;
    }
    if (trimmedName.length > NAME_MAX_LENGTH) {
      setTeamError(`Team name cannot exceed ${NAME_MAX_LENGTH} characters.`);
      return;
    }
    if (teamDescription.trim().length > DESCRIPTION_MAX_LENGTH) {
      setTeamError(`Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters.`);
      return;
    }

    setTeamSubmitting(true);
    setTeamError(null);
    try {
      const { data } = await createTeamMutation({
        variables: {
          name: trimmedName,
          description: teamDescription.trim() || null,
        },
      });
      await refetchTeams();
      const newTeamId = data?.createTeam?.id ?? null;
      if (newTeamId) {
        setActiveTeamId(newTeamId);
      }
      resetTeamDialog();
    } catch (error) {
      setTeamError((error as Error).message ?? "Unable to create team.");
    } finally {
      setTeamSubmitting(false);
    }
  }, [createTeamMutation, refetchTeams, resetTeamDialog, setActiveTeamId, teamDescription, teamName]);

  const handleDragStart = useCallback(() => {
    if (unblockTimeout.current) {
      clearTimeout(unblockTimeout.current);
      unblockTimeout.current = null;
    }
    setBlockNavigation(true);
  }, []);

  const handleReorder = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!user || !over || active.id === over.id) {
        scheduleUnblockNavigation();
        return;
      }

      setOrderedProjects((current) => {
        const oldIndex = current.findIndex((project) => project.id === active.id);
        const newIndex = current.findIndex((project) => project.id === over.id);
        if (oldIndex === -1 || newIndex === -1) {
          scheduleUnblockNavigation();
          return current;
        }
        const previousOrder = current.slice();
        const reordered = arrayMove(current, oldIndex, newIndex);
        void persistOrder(reordered, previousOrder);
        scheduleUnblockNavigation();
        return reordered;
      });
    },
    [persistOrder, scheduleUnblockNavigation, user]
  );

  const handleDragCancel = useCallback(() => {
    scheduleUnblockNavigation();
  }, [scheduleUnblockNavigation]);

  return (
    <>
      <div className="space-y-3 border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          {hasTeams ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild disabled={loadingTeams}>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between text-sm font-medium"
                  disabled={loadingTeams}
                >
                  <span className="truncate">
                    {loadingTeams
                      ? "Loading teams…"
                      : activeTeam?.name ?? "Select a team"}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 opacity-70" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                {teams.map((team) => (
                  <DropdownMenuItem
                    key={team.id}
                    onSelect={(event) => {
                      event.preventDefault();
                      setActiveTeamId(team.id);
                    }}
                    className={cn("justify-between", team.id === activeTeamId && "bg-accent text-accent-foreground")}
                  >
                    <span className="truncate">{team.name}</span>
                    {team.id === activeTeamId ? (
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        Active
                      </Badge>
                    ) : null}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    setTeamError(null);
                    setTeamName("");
                    setTeamDescription("");
                    setShowCreateTeam(true);
                  }}
                  className="gap-2"
                  data-test="create-team-button"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New team
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center text-sm font-medium"
              onClick={() => {
                setTeamError(null);
                setTeamName("");
                setTeamDescription("");
                setShowCreateTeam(true);
              }}
              data-test="create-team-button"
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Create first team
            </Button>
          )}
          {activeRoleLabel ? (
            <Badge variant="outline" className="whitespace-nowrap text-xs uppercase">
              {activeRoleLabel}
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Projects</p>
            <p className="text-sm text-muted-foreground/80">
              {projectsLoading ? "Loading…" : `${projects.length} total`}
            </p>
          </div>
          {user ? (
            <Dialog open={showCreate} onOpenChange={handleProjectDialogChange}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!activeTeamId || !canManageProjects || projectsLoading}
                  className="gap-1 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create project</DialogTitle>
                </DialogHeader>
                <Separator className="my-4" />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-name">Project name</Label>
                    <div className="relative rounded-lg border border-border bg-[hsl(var(--card))] px-3 py-2 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
                      <Input
                        id="create-name"
                        value={createName}
                        onChange={(event) => setCreateName(event.target.value.slice(0, NAME_MAX_LENGTH))}
                        maxLength={NAME_MAX_LENGTH}
                        className="border-0 bg-transparent px-0 pr-16 text-sm text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        autoFocus
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                        {createName.length}/{NAME_MAX_LENGTH}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-description">Description (optional)</Label>
                    <div className="relative rounded-lg border border-border bg-[hsl(var(--card))] px-3 py-2 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
                      <Textarea
                        id="create-description"
                        value={createDescription}
                        onChange={(event) => setCreateDescription(event.target.value.slice(0, DESCRIPTION_MAX_LENGTH))}
                        maxLength={DESCRIPTION_MAX_LENGTH}
                        className="min-h-[120px] border-0 bg-transparent px-0 pr-16 pb-8 text-sm text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                      <span className="pointer-events-none absolute bottom-3 right-3 text-xs text-muted-foreground">
                        {createDescription.length}/{DESCRIPTION_MAX_LENGTH}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-dashed border-border bg-muted px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {createPublic ? "Public project" : "Private project"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {createPublic
                          ? "Anyone with the link can view this project."
                          : "Only invited members can access this project."}
                      </p>
                    </div>
                    <Switch
                      checked={createPublic}
                      onCheckedChange={setCreatePublic}
                    />
                  </div>
                  {createError ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {createError}
                    </div>
                  ) : null}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (!createSubmitting) {
                        handleProjectDialogChange(false);
                      }
                    }}
                    disabled={createSubmitting}
                    className="border border-transparent transition-colors hover:!bg-neutral-200 hover:!text-foreground dark:border-neutral-700 dark:hover:!bg-neutral-800"
                  >
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleCreate} disabled={createSubmitting}>
                    {createSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create project
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </div>

      <ScrollArea className="flex-1 px-2 py-4">
        {showEmptyTeamsState ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-muted px-4 py-6 text-center text-xs text-muted-foreground">
            <p>Create a team to start organizing your projects.</p>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setTeamError(null);
                setTeamName("");
                setTeamDescription("");
                setShowCreateTeam(true);
              }}
              data-test="create-team-button"
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New team
            </Button>
          </div>
        ) : projectsLoading ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted px-4 py-6 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Loading projects…
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted px-4 py-6 text-center text-xs text-muted-foreground">
            {user
              ? "Create your first project to get started."
              : "Sign in to view your projects."}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleReorder}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={orderedProjects.map((project) => project.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {orderedProjects.map((project) => (
                  <SortableProjectItem
                    key={project.id}
                    project={project}
                    disableNavigation={blockNavigation}
                    draggableEnabled={canManageProjects}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </ScrollArea>

      <Dialog
        open={showCreateTeam}
        onOpenChange={(open) => {
          if (!open && !teamSubmitting) {
            resetTeamDialog();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create team</DialogTitle>
          </DialogHeader>
          <Separator className="my-4" />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team name</Label>
              <div className="relative rounded-lg border border-border bg-[hsl(var(--card))] px-3 py-2 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
                <Input
                  id="team-name"
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value.slice(0, NAME_MAX_LENGTH))}
                  maxLength={NAME_MAX_LENGTH}
                  className="border-0 bg-transparent px-0 pr-16 text-sm text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  autoFocus
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                  {teamName.length}/{NAME_MAX_LENGTH}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-description">Description (optional)</Label>
              <div className="relative rounded-lg border border-border bg-[hsl(var(--card))] px-3 py-2 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
                <Textarea
                  id="team-description"
                  value={teamDescription}
                  onChange={(event) => setTeamDescription(event.target.value.slice(0, DESCRIPTION_MAX_LENGTH))}
                  maxLength={DESCRIPTION_MAX_LENGTH}
                  className="min-h-[120px] border-0 bg-transparent px-0 pr-16 pb-8 text-sm text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <span className="pointer-events-none absolute bottom-3 right-3 text-xs text-muted-foreground">
                  {teamDescription.length}/{DESCRIPTION_MAX_LENGTH}
                </span>
              </div>
            </div>
            {teamError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {teamError}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={resetTeamDialog}
              disabled={teamSubmitting}
              className="border border-transparent transition-colors hover:!bg-neutral-200 hover:!text-foreground dark:border-neutral-700 dark:hover:!bg-neutral-800"
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateTeam} disabled={teamSubmitting}>
              {teamSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SortableProjectItem({
  project,
  disableNavigation,
  draggableEnabled,
}: {
  project: SidebarContentProps["projects"][number];
  disableNavigation: boolean;
  draggableEnabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isSorting } = useSortable({
    id: project.id,
    disabled: !draggableEnabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const handleLinkClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (disableNavigation || isDragging || isSorting) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [disableNavigation, isDragging, isSorting]
  );

  return (
    <nav
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-lg border border-border bg-card transition hover:border-blue-500/10 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-primary",
        isDragging && "cursor-grabbing border-primary/40 bg-primary/10 opacity-80 shadow-lg"
      )}
      {...attributes}
      {...(draggableEnabled ? listeners : {})}
    >
      <NavLink
        to={`/projects/${project.id}`}
        className={({ isActive }) =>
          getNavItemHighlightClasses({
            isActive,
            className: cn(
              "flex flex-col gap-2 rounded-lg border border-transparent px-3 py-3 text-sm transition",
              disableNavigation && "pointer-events-none"
            ),
          })
        }
        onClick={handleLinkClick}
        tabIndex={disableNavigation ? -1 : 0}
      >
        <div className="flex items-center justify-between">
          <span className="truncate font-semibold text-foreground transition group-hover:text-slate-900 dark:group-hover:text-primary">
            {project.name}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "uppercase tracking-wide text-xs transition group-hover:border-slate-400 group-hover:text-slate-700 dark:group-hover:border-white/30 dark:group-hover:text-primary/80",
              project.is_public
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200"
                : "border border-border text-muted-foreground"
            )}
          >
            {project.is_public ? "Public" : "Private"}
          </Badge>
        </div>
      </NavLink>
    </nav>
  );
}
