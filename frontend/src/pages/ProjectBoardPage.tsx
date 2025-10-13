import { useMemo, useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Loader2, UserPlus2, Settings, Trash2 } from "lucide-react";
import type { AuthUser, Task, Project } from "@shared/types";
import { KanbanBoard } from "../components/KanbanBoard/KanbanBoard";
import { useProjectBoard } from "../hooks/useProjectBoard";
import { GET_PROJECT, UPDATE_PROJECT, DELETE_PROJECT, GET_PROJECTS_OVERVIEW, LEAVE_PROJECT } from "../graphql";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
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

const NAME_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 600;

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
    workflow,
    stages,
    createTask,
    deleteTask,
    moveTask,
    addStage,
    generateWorkflowStages: generateWorkflowStagesFromAI,
    reorderStage,
    deleteStage,
    reorderStagesOrder,
    loading,
  } = useProjectBoard();
  const workflowTeamId = workflow?.team_id ?? null;
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
    () => project?.team_id ?? workflowTeamId ?? null,
    [project?.team_id, workflowTeamId]
  );

  const backDestination = useMemo(() => (projectId ? `/projects/${projectId}` : "/"), [projectId]);
  const handleBackNavigation = useCallback(() => {
    navigate(backDestination);
  }, [navigate, backDestination]);

  const projectName = project?.name ?? workflow?.name ?? "Project";

  const [isWorkflowPromptOpen, setIsWorkflowPromptOpen] = useState(false);
  const [workflowPrompt, setWorkflowPrompt] = useState("");
  const [workflowPromptError, setWorkflowPromptError] = useState<string | null>(null);
  const [isGeneratingWorkflow, setIsGeneratingWorkflow] = useState(false);

  const [settingsProject, setSettingsProject] = useState<Project | null>(null);
  const [settingsName, setSettingsName] = useState("");
  const [settingsDescription, setSettingsDescription] = useState("");
  const [settingsPublic, setSettingsPublic] = useState(false);
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [isDeleteSectionOpen, setIsDeleteSectionOpen] = useState(false);

  const [leaveProjectLoading, setLeaveProjectLoading] = useState(false);
  const [leaveProjectError, setLeaveProjectError] = useState<string | null>(null);

  const [updateProject] = useMutation(UPDATE_PROJECT);
  const [removeProject] = useMutation(DELETE_PROJECT);
  const [leaveProjectMutation] = useMutation(LEAVE_PROJECT);

  const resetSettingsState = useCallback(() => {
    setSettingsProject(null);
    setSettingsError(null);
    setDeleteError(null);
    setDeleteConfirmation("");
    setIsDeleteSectionOpen(false);
  }, []);

  const openProjectSettings = useCallback(() => {
    if (!project) return;
    setSettingsProject(project);
    setSettingsName(project.name ?? "");
    setSettingsDescription(project.description ?? "");
    setSettingsPublic(Boolean(project.is_public));
    setSettingsError(null);
    setDeleteError(null);
    setDeleteConfirmation("");
    setIsDeleteSectionOpen(false);
  }, [project]);

  const hasSettingsChanges = useMemo(() => {
    if (!settingsProject) return false;
    const initialName = settingsProject.name ?? "";
    const initialDescription = settingsProject.description ?? "";
    const initialPublic = Boolean(settingsProject.is_public);
    return (
      settingsName !== initialName ||
      settingsDescription !== initialDescription ||
      settingsPublic !== initialPublic
    );
  }, [settingsDescription, settingsName, settingsProject, settingsPublic]);

  const handleSettingsSave = useCallback(async () => {
    if (!settingsProject) return;
    if (!hasSettingsChanges) return;
    const trimmed = settingsName.trim();
    if (!trimmed) {
      setSettingsError("Project name is required.");
      return;
    }
    if (trimmed.length > NAME_MAX_LENGTH) {
      setSettingsError(`Project name cannot exceed ${NAME_MAX_LENGTH} characters.`);
      return;
    }
    if (settingsDescription.trim().length > DESCRIPTION_MAX_LENGTH) {
      setSettingsError(`Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters.`);
      return;
    }

    setSettingsSubmitting(true);
    setSettingsError(null);
    try {
      await updateProject({
        variables: {
          id: settingsProject.id,
          name: trimmed,
          description: settingsDescription.trim() || null,
          is_public: settingsPublic,
        },
        refetchQueries: projectTeamId
          ? [{ query: GET_PROJECTS_OVERVIEW, variables: { team_id: projectTeamId } }]
          : [],
      });
      await refetchProject();
      resetSettingsState();
    } catch (error) {
      setSettingsError((error as Error).message ?? "Unable to update project.");
    } finally {
      setSettingsSubmitting(false);
    }
  }, [
    hasSettingsChanges,
    resetSettingsState,
    settingsDescription,
    settingsName,
    settingsProject,
    settingsPublic,
    updateProject,
    projectTeamId,
    refetchProject,
  ]);

  const handleProjectDelete = useCallback(async () => {
    if (!settingsProject) return;
    if (deleteConfirmation.trim().toLowerCase() !== "delete") {
      setDeleteError('Type "delete" to confirm deletion.');
      return;
    }

    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      await removeProject({
        variables: { id: settingsProject.id },
        refetchQueries: projectTeamId
          ? [{ query: GET_PROJECTS_OVERVIEW, variables: { team_id: projectTeamId } }]
          : [],
      });
      if (projectId && settingsProject.id === projectId) {
        navigate("/");
      }
      resetSettingsState();
    } catch (error) {
      setDeleteError((error as Error).message ?? "Unable to delete project.");
    } finally {
      setDeleteSubmitting(false);
    }
  }, [deleteConfirmation, navigate, projectId, projectTeamId, removeProject, resetSettingsState, settingsProject]);

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
      resetSettingsState();
    } catch (error) {
      setLeaveProjectError((error as Error).message ?? "Unable to leave project.");
    } finally {
      setLeaveProjectLoading(false);
    }
  }, [
    project?.id,
    project?.name,
    leaveProjectMutation,
    navigate,
    projectId,
    projectTeamId,
    resetSettingsState,
    refetchProject,
  ]);

  useEffect(() => {
    setLeaveProjectError(null);
    setLeaveProjectLoading(false);
  }, [projectId]);

  const handleGenerateWorkflow = useCallback(async () => {
    const trimmed = workflowPrompt.trim();
    if (!trimmed) {
      setWorkflowPromptError("Describe the workflow you'd like to generate.");
      return;
    }

    setWorkflowPromptError(null);
    setIsGeneratingWorkflow(true);
    try {
      await generateWorkflowStagesFromAI(trimmed);
      setIsWorkflowPromptOpen(false);
      setWorkflowPrompt("");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.replace(/^GraphQL error:\s*/i, "")
          : "Failed to generate workflow.";
      setWorkflowPromptError(message || "Failed to generate workflow.");
    } finally {
      setIsGeneratingWorkflow(false);
    }
  }, [workflowPrompt, generateWorkflowStagesFromAI]);

  const handleCancelWorkflowPrompt = useCallback(() => {
    setIsWorkflowPromptOpen(false);
    setWorkflowPromptError(null);
  }, []);

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
                onClick={() => {
                  setWorkflowPromptError(null);
                  setIsWorkflowPromptOpen((open) => !open);
                }}
                disabled={isGeneratingWorkflow}
                className={getNavItemHighlightClasses({
                  isActive: isWorkflowPromptOpen,
                  className: "hidden min-w-[12rem] justify-center gap-2 sm:inline-flex",
                  inactiveClassName:
                    "border-border hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-border dark:hover:border-white/15 dark:hover:bg-white/10 dark:hover:text-primary",
                })}
                aria-pressed={isWorkflowPromptOpen}
              >
                <Sparkles className="h-4 w-4" />
                {isWorkflowPromptOpen ? "Close AI Workflow" : "Generate AI Workflow"}
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
                      isActive: Boolean(settingsProject),
                      className: "h-10 w-10",
                      inactiveClassName:
                        "border-border hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-border dark:hover:border-white/15 dark:hover:bg-white/10 dark:hover:text-primary",
                    })}
                    aria-pressed={Boolean(settingsProject)}
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
                          openProjectSettings();
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
              onClick={() => {
                setWorkflowPromptError(null);
                setIsWorkflowPromptOpen((open) => !open);
              }}
              disabled={isGeneratingWorkflow}
              className="justify-center gap-2"
              aria-pressed={isWorkflowPromptOpen}
            >
              <Sparkles className="h-4 w-4" />
              {isWorkflowPromptOpen ? "Close AI Workflow" : "Generate AI Workflow"}
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

        {user && isWorkflowPromptOpen ? (
          <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-primary shadow-sm">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Describe the workflow you need</p>
              <p className="text-xs text-primary/80">
                Mention goals, hand-offs, or constraints. We&apos;ll suggest stage names in order and add them to your board.
              </p>
            </div>
            <Textarea
              value={workflowPrompt}
              onChange={(event) => {
                setWorkflowPrompt(event.target.value);
                if (workflowPromptError) {
                  setWorkflowPromptError(null);
                }
              }}
              placeholder="e.g. A software release pipeline from idea to deployment with QA and launch"
              className="min-h-[120px] bg-[hsl(var(--sidebar-background))] text-primary placeholder:text-primary/60"
              disabled={isGeneratingWorkflow}
            />
            {workflowPromptError ? <p className="text-sm text-destructive">{workflowPromptError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void handleGenerateWorkflow()}
                disabled={isGeneratingWorkflow}
                className="gap-2"
              >
                {isGeneratingWorkflow ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate workflow
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelWorkflowPrompt}
                disabled={isGeneratingWorkflow}
                className="rounded-md border border-white/30 bg-transparent px-4 py-2 text-sm font-medium text-primary hover:border-white/40 hover:bg-white/10 hover:text-primary"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

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
        open={Boolean(settingsProject)}
        onOpenChange={(open) => {
          if (!open && !settingsSubmitting && !deleteSubmitting) {
            resetSettingsState();
          }
        }}
      >
        {settingsProject ? (
          <DialogContent className="max-w-lg">
            <DialogHeader className="space-y-1">
              <DialogTitle>Project Settings</DialogTitle>
              <Separator className="my-4" />
            </DialogHeader>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleSettingsSave();
              }}
              className="space-y-6"
            >
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project-settings-name">Project name</Label>
                  <div className="relative rounded-lg border border-border bg-[hsl(var(--card))] px-3 py-2 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
                    <Input
                      id="project-settings-name"
                      value={settingsName}
                      onChange={(event) => setSettingsName(event.target.value.slice(0, NAME_MAX_LENGTH))}
                      maxLength={NAME_MAX_LENGTH}
                      required
                      className="border-0 bg-transparent px-0 pr-16 text-sm text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                      {settingsName.length}/{NAME_MAX_LENGTH}
                    </span>
                  </div>
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

              <div className="space-y-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex w-full items-center justify-between text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() =>
                    setIsDeleteSectionOpen((prev) => {
                      const next = !prev;
                      if (!next) {
                        setDeleteError(null);
                        setDeleteConfirmation("");
                      }
                      return next;
                    })
                  }
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </span>
                  <span className="text-xs">{isDeleteSectionOpen ? "Hide" : "Show"}</span>
                </Button>
                {isDeleteSectionOpen ? (
                  <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 shadow-[0_0_0_1px_rgba(220,38,38,0.08)]">
                    <p className="text-xs text-destructive/80">
                      Deleting <span className="font-semibold">{settingsProject.name}</span> is permanent and removes all
                      of its tasks.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="project-delete-confirm" className="text-xs font-medium text-destructive">
                        Type delete to confirm
                      </Label>
                      <Input
                        id="project-delete-confirm"
                        value={deleteConfirmation}
                        onChange={(event) => setDeleteConfirmation(event.target.value)}
                        placeholder="delete"
                        disabled={deleteSubmitting}
                        className="border border-destructive/40 focus-visible:ring-destructive"
                      />
                    </div>
                    {deleteError ? <p className="text-xs text-destructive">{deleteError}</p> : null}
                    <Button
                      type="button"
                      variant="destructive"
                      className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
                      disabled={
                        settingsSubmitting ||
                        deleteSubmitting ||
                        deleteConfirmation.trim().toLowerCase() !== "delete"
                      }
                      onClick={() => {
                        setDeleteError(null);
                        void handleProjectDelete();
                      }}
                    >
                      {deleteSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Delete project
                    </Button>
                  </div>
                ) : null}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetSettingsState}
                  disabled={settingsSubmitting || deleteSubmitting}
                  className="rounded-md border border-white/30 bg-transparent px-4 py-2 text-sm font-medium text-primary hover:border-white/40 hover:bg-white/10 hover:text-primary"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={settingsSubmitting || deleteSubmitting || !hasSettingsChanges}>
                  {settingsSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
