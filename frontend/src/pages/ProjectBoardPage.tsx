import { useMemo, useCallback, useEffect, useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Settings, Sparkles, UserPlus2 } from "lucide-react";
import type { AuthUser, Task, Project } from "@shared/types";
import { KanbanBoard } from "../components/KanbanBoard/KanbanBoard";
import { useProjectBoard } from "../hooks/useProjectBoard";
import {
  GET_PROJECT,
  UPDATE_PROJECT,
  DELETE_PROJECT,
  GET_PROJECTS_OVERVIEW,
  LEAVE_PROJECT,
  REMOVE_PROJECT_MEMBER,
} from "../graphql";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { getNavItemHighlightClasses } from "../lib/navigation";
import {
  useProjectSettingsDialog,
  NAME_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
} from "../hooks/useProjectSettingsDialog";
import { ProjectDangerZone } from "../components/ProjectBoard/ProjectDangerZone";
import { WorkflowGenerator } from "../components/ProjectBoard/WorkflowGenerator";
import { DEFAULT_AVATAR_COLOR } from "../constants/colors";
import { getFullName, getInitials } from "../utils/user";

export function ProjectBoardPage({
  user,
  setSelectedTask,
  onInvite,
}: {
  user: AuthUser | null;
  setSelectedTask: (task: Task) => void;
  onInvite: (projectId: string) => void;
}) {
  const {
    projectId,
    board,
    stages,
    createTask,
    deleteTask,
    moveTask,
    addStage,
    generateBoardStages: generateBoardStagesFromAI,
    reorderStage,
    deleteStage,
    reorderStagesOrder,
    loading,
  } = useProjectBoard();
  const boardTeamId = board?.team_id ?? null;
  const navigate = useNavigate();

  const {
    data: projectData,
    loading: projectLoading,
    error: projectError,
    refetch: refetchProject,
  } = useQuery<{ project: Project | null }>(GET_PROJECT, {
    variables: projectId ? { id: projectId } : undefined,
    skip: !projectId,
    fetchPolicy: "network-only",
    nextFetchPolicy: "cache-first",
    errorPolicy: "all",
  });

  const project = projectData?.project ?? null;

  const projectTeamId = useMemo(
    () => project?.team_id ?? boardTeamId ?? null,
    [project?.team_id, boardTeamId]
  );

  const backDestination = useMemo(() => (projectId ? `/projects/${projectId}` : "/"), [projectId]);
  const handleBackNavigation = useCallback(() => {
    navigate(backDestination);
  }, [navigate, backDestination]);

  const projectName = project?.name ?? board?.name ?? "Project";

  const [updateProject] = useMutation(UPDATE_PROJECT);
  const [removeProject] = useMutation(DELETE_PROJECT);
  const [removeProjectMemberMutation] = useMutation(REMOVE_PROJECT_MEMBER);
  const [leaveProjectMutation] = useMutation(LEAVE_PROJECT);

  const {
    isOpen: isSettingsOpen,
    dialogProject,
    name: settingsName,
    setName: setSettingsName,
    description: settingsDescription,
    setDescription: setSettingsDescription,
    isPublic: settingsPublic,
    setIsPublic: setSettingsPublic,
    error: settingsError,
    isSubmitting: settingsSubmitting,
    hasChanges,
    openSettings,
    closeSettings,
    saveSettings,
    deleteState,
    membershipState,
  } = useProjectSettingsDialog({
    project,
    projectTeamId,
    overviewRefetchDocument: GET_PROJECTS_OVERVIEW,
    updateProject,
    removeProject,
    removeProjectMember: removeProjectMemberMutation,
    refetchProject,
    onProjectDeleted: () => {
      if (projectId && project?.id === projectId) {
        navigate("/");
      }
    },
  });
  const {
    removeMember: removeProjectCollaborator,
    removingMemberId: removingCollaboratorId,
    memberActionError: projectMemberActionError,
  } = membershipState;

  const [leaveProjectLoading, setLeaveProjectLoading] = useState(false);
  const [leaveProjectError, setLeaveProjectError] = useState<string | null>(null);

  const canManageProject = Boolean(
    user &&
      projectId &&
      (project?.viewer_role === "owner" || project?.viewer_role === "admin")
  );

  const handleLeaveProject = useCallback(async () => {
    if (!projectId) return;
    const name = project?.name ?? "this project";
    const confirmed = window.confirm(`Leave the project "${name}"?`);
    if (!confirmed) return;

    setLeaveProjectError(null);
    setLeaveProjectLoading(true);
    try {
      await leaveProjectMutation({
        variables: { project_id: projectId },
        refetchQueries: projectTeamId
          ? [{ query: GET_PROJECTS_OVERVIEW, variables: { team_id: projectTeamId } }]
          : [],
      });
      await refetchProject();
      if (projectId === project?.id) {
        navigate("/");
      }
      closeSettings();
    } catch (error) {
      setLeaveProjectError((error as Error).message ?? "Unable to leave project.");
    } finally {
      setLeaveProjectLoading(false);
    }
  }, [
    closeSettings,
    leaveProjectMutation,
    navigate,
    project?.id,
    project?.name,
    projectId,
    projectTeamId,
    refetchProject,
  ]);

  useEffect(() => {
    setLeaveProjectError(null);
    setLeaveProjectLoading(false);
  }, [projectId]);

  if (!projectId) {
    return <div className="p-6 text-destructive">Project identifier is missing.</div>;
  }

  if (loading || projectLoading) {
    return <div className="p-6 text-muted-foreground">Loading project board…</div>;
  }

  if (projectError) {
    return <div className="p-6 text-destructive">Unable to load project: {projectError.message}</div>;
  }

  if (!project) {
    return <div className="p-6 text-destructive">We couldn&apos;t find that project.</div>;
  }

  return (
    <WorkflowGenerator canUseAI={Boolean(user)} onGenerate={generateBoardStagesFromAI}>
      {({ isOpen: isGeneratorOpen, isGenerating: isGeneratingWorkflow, toggle: toggleGeneratorPrompt, panel: generatorPanel }) => (
        <div className="flex min-h-full flex-col">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBackNavigation}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <h1 className="truncate text-lg font-semibold text-foreground sm:text-xl">{projectName}</h1>
              </div>
              <div className="flex items-center gap-2">
                {user ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={toggleGeneratorPrompt}
                    disabled={isGeneratingWorkflow}
                    className={getNavItemHighlightClasses({
                      isActive: isGeneratorOpen,
                      className: "hidden min-w-[12rem] justify-center gap-2 sm:inline-flex",
                      inactiveClassName:
                        "border-border hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-border dark:hover:border-white/15 dark:hover:bg-white/10 dark:hover:text-primary",
                    })}
                    aria-pressed={isGeneratorOpen}
                  >
                    <Sparkles className="h-4 w-4" />
                    {isGeneratorOpen ? "Close AI Stage Helper" : "Generate AI Stages"}
                  </Button>
                ) : null}
                {canManageProject ? (
                  <Button
                    type="button"
                    onClick={() => onInvite(projectId)}
                    variant="default"
                    className="hidden items-center gap-2 sm:inline-flex"
                  >
                    <UserPlus2 className="h-4 w-4" />
                    Invite
                  </Button>
                ) : null}
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className={getNavItemHighlightClasses({
                          isActive: isSettingsOpen,
                          className: "h-10 w-10",
                          inactiveClassName:
                            "border-border hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-border dark:hover:border-white/15 dark:hover:bg-white/10 dark:hover:text-primary",
                        })}
                        aria-pressed={isSettingsOpen}
                        disabled={leaveProjectLoading}
                      >
                        <Settings className="h-4 w-4" />
                        <span className="sr-only">Project options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {canManageProject ? (
                        <>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              openSettings();
                            }}
                          >
                            Project settings
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      ) : null}
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          void handleLeaveProject();
                        }}
                        className="text-destructive focus:text-destructive"
                        disabled={leaveProjectLoading}
                      >
                        {leaveProjectLoading ? "Leaving…" : "Leave project"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </div>
          </header>

          <div className="flex-1 space-y-4 px-4 py-6 sm:px-6">
            {user ? (
              <div className="flex flex-col gap-2 sm:hidden">
                <Button
                  type="button"
                  variant="outline"
                  onClick={toggleGeneratorPrompt}
                  disabled={isGeneratingWorkflow}
                  className="justify-center gap-2"
                  aria-pressed={isGeneratorOpen}
                >
                  <Sparkles className="h-4 w-4" />
                  {isGeneratorOpen ? "Close AI Stage Helper" : "Generate AI Stages"}
                </Button>
                {canManageProject ? (
                  <Button
                    type="button"
                    onClick={() => onInvite(projectId)}
                    variant="default"
                    className="justify-center gap-2"
                  >
                    <UserPlus2 className="h-4 w-4" />
                    Invite
                  </Button>
                ) : null}
              </div>
            ) : null}

            {leaveProjectError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {leaveProjectError}
              </div>
            ) : null}

            {generatorPanel}

            <div className="min-w-0 pb-4">
              <KanbanBoard
                stages={stages}
                onDelete={user ? (id: Task["id"]) => deleteTask(id) : undefined}
                onMoveTask={moveTask}
                onReorderTasks={reorderStage}
                onAddTask={user ? (stageId, title) => createTask(stageId, title) : undefined}
                onAddStage={user ? addStage : undefined}
                onDeleteStage={user ? (stageId: string) => deleteStage(stageId) : undefined}
                onReorderStages={user ? (ordered) => reorderStagesOrder(ordered) : undefined}
                user={user}
                setSelectedTask={setSelectedTask}
              />
            </div>
          </div>

          <Dialog
            open={isSettingsOpen}
            onOpenChange={(open) => {
              if (!open) {
                closeSettings();
              }
            }}
          >
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
              {dialogProject ? (
                <form
                  className="space-y-6"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveSettings();
                  }}
                >
                  <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">Project settings</DialogTitle>
                  </DialogHeader>
                  <Separator />

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="project-settings-name">Name</Label>
                      <Input
                        id="project-settings-name"
                        value={settingsName}
                        onChange={(event) =>
                          setSettingsName(event.target.value.slice(0, NAME_MAX_LENGTH))
                        }
                        maxLength={NAME_MAX_LENGTH}
                        placeholder="Project name"
                        disabled={settingsSubmitting}
                        className="bg-[hsl(var(--card))]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project-settings-description">Description</Label>
                      <div className="relative rounded-lg border border-border bg-[hsl(var(--card))] px-3 py-2 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
                        <Textarea
                          id="project-settings-description"
                          value={settingsDescription}
                          onChange={(event) =>
                            setSettingsDescription(event.target.value.slice(0, DESCRIPTION_MAX_LENGTH))
                          }
                          maxLength={DESCRIPTION_MAX_LENGTH}
                          className="min-h-[140px] border-0 bg-transparent px-0 pr-16 pb-8 text-sm text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        <span className="pointer-events-none absolute bottom-3 right-3 text-xs text-muted-foreground">
                          {settingsDescription.length}/{DESCRIPTION_MAX_LENGTH}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {settingsPublic ? "Public project" : "Private project"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {settingsPublic
                            ? "Anyone with the link can view this project."
                            : "Only invited members can access this project."}
                        </p>
                      </div>
                      <Switch checked={settingsPublic} onCheckedChange={setSettingsPublic} />
                    </div>
                  </div>

                  {settingsError ? <p className="text-sm text-destructive">{settingsError}</p> : null}

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Collaborators</h3>
                        <p className="text-xs text-muted-foreground">
                          Remove teammates who no longer need access to this project.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        className="gap-2"
                        onClick={() => {
                          if (!dialogProject?.id) return;
                          closeSettings();
                          onInvite(dialogProject.id);
                        }}
                      >
                        <UserPlus2 className="h-4 w-4" />
                        Invite
                      </Button>
                    </div>

                    {projectMemberActionError ? (
                      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {projectMemberActionError}
                      </div>
                    ) : null}

                    <div className="space-y-3">
                      {(dialogProject.members ?? []).length > 0 ? (
                        (dialogProject.members ?? []).map((member) => {
                          if (!member) return null;
                          const fullName = getFullName(member);
                          const displayName = fullName || `@${member.username}`;
                          const isViewer = member.id === user?.id;

                          return (
                            <div
                              key={member.id}
                              className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/40 px-3 py-3"
                            >
                              <Avatar className="h-9 w-9 border border-border/60">
                                <AvatarFallback
                                  className="text-xs font-semibold uppercase text-primary-foreground"
                                  style={{ backgroundColor: member.avatar_color ?? DEFAULT_AVATAR_COLOR }}
                                >
                                  {getInitials(member)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  {displayName}
                                </p>
                                <p className="text-xs text-muted-foreground">@{member.username}</p>
                              </div>
                              <div className="ml-auto flex items-center gap-2">
                                {isViewer ? (
                                  <span className="text-xs text-muted-foreground">You</span>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => {
                                      const confirmed = window.confirm(
                                        `Remove ${displayName} from the project "${dialogProject.name ?? "this project"}"?`
                                      );
                                      if (!confirmed) return;
                                      void removeProjectCollaborator(member.id);
                                    }}
                                    disabled={removingCollaboratorId === member.id}
                                  >
                                    {removingCollaboratorId === member.id ? "Removing…" : "Remove"}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
                          No collaborators yet. Invite teammates to get started.
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <ProjectDangerZone
                    projectName={dialogProject.name ?? "this project"}
                    deleteState={deleteState}
                    disableActions={settingsSubmitting || deleteState.isDeleting}
                    onLeaveProject={handleLeaveProject}
                    leaveError={leaveProjectError}
                    leaveLoading={leaveProjectLoading}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeSettings}
                      disabled={settingsSubmitting || deleteState.isDeleting}
                      className="rounded-md border border-white/30 bg-transparent px-4 py-2 text-sm font-medium text-primary hover:border-white/40 hover:bg-white/10 hover:text-primary"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={settingsSubmitting || deleteState.isDeleting || !hasChanges}>
                      {settingsSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save changes
                    </Button>
                  </DialogFooter>
                </form>
              ) : null}
            </DialogContent>
          </Dialog>
        </div>
      )}
    </WorkflowGenerator>
  );
}
