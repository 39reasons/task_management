import { useMemo, useState, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import { KanbanBoard } from "../components/KanbanBoard/KanbanBoard";
import { useProjectBoard } from "../hooks/useProjectBoard";
import { GET_PROJECTS, UPDATE_PROJECT, DELETE_PROJECT, GET_PROJECTS_OVERVIEW } from "../graphql";
import type { AuthUser, Task, Project } from "@shared/types";
import { Sparkles, Loader2, UserPlus2, Settings, ShieldAlert, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
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
  const [showDanger, setShowDanger] = useState(false);
  const navigate = useNavigate();

  const [updateProject] = useMutation(UPDATE_PROJECT, {
    refetchQueries: [
      { query: GET_PROJECTS },
      { query: GET_PROJECTS_OVERVIEW },
    ],
  });
  const [removeProject] = useMutation(DELETE_PROJECT, {
    refetchQueries: [
      { query: GET_PROJECTS },
      { query: GET_PROJECTS_OVERVIEW },
    ],
  });

  const resetSettingsState = useCallback(() => {
    setSettingsProject(null);
    setSettingsError(null);
    setDeleteError(null);
    setDeleteConfirmation("");
    setShowDanger(false);
  }, []);

  const { data: projectsData } = useQuery<{ projects: Project[] }>(GET_PROJECTS, {
    skip: !projectId,
    fetchPolicy: "network-only",
    nextFetchPolicy: "cache-first",
    errorPolicy: "all",
    returnPartialData: true,
  });

  const currentProject = useMemo(() => {
    if (!projectId) {
      return null;
    }
    return projectsData?.projects?.find((project) => project.id === projectId) ?? null;
  }, [projectId, projectsData]);

  const projectName = currentProject?.name ?? workflow?.name ?? "Project";

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

  const openProjectSettings = useCallback(() => {
    if (!currentProject) return;
    setSettingsProject(currentProject);
    setSettingsName(currentProject.name ?? "");
    setSettingsDescription(currentProject.description ?? "");
    setSettingsPublic(Boolean(currentProject.is_public));
    setSettingsError(null);
    setDeleteError(null);
    setDeleteConfirmation("");
    setShowDanger(false);
  }, [currentProject]);

  const handleSettingsSave = useCallback(async () => {
    if (!settingsProject) return;
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
      });
      resetSettingsState();
    } catch (error) {
      setSettingsError((error as Error).message ?? "Unable to update project.");
    } finally {
      setSettingsSubmitting(false);
    }
  }, [resetSettingsState, settingsDescription, settingsName, settingsProject, settingsPublic, updateProject]);

  const handleProjectDelete = useCallback(async () => {
    if (!settingsProject) return;
    if (deleteConfirmation.trim().toUpperCase() !== "DELETE") {
      setDeleteError('Type "DELETE" to confirm deletion.');
      return;
    }

    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      await removeProject({ variables: { id: settingsProject.id } });
      if (projectId && settingsProject.id === projectId) {
        navigate("/");
      }
      resetSettingsState();
    } catch (error) {
      setDeleteError((error as Error).message ?? "Unable to delete project.");
    } finally {
      setDeleteSubmitting(false);
    }
  }, [deleteConfirmation, navigate, projectId, removeProject, resetSettingsState, settingsProject]);

  const canManageProject = Boolean(user && projectId && currentProject?.viewer_is_owner);

  const handleCancelWorkflowPrompt = useCallback(() => {
    setIsWorkflowPromptOpen(false);
    setWorkflowPromptError(null);
  }, []);

  if (loading) {
    return <div className="text-muted-foreground">Loading board…</div>;
  }

  return (
    <div className="space-y-4 min-w-0">
      <Card className="w-full rounded-2xl border border-border/60 bg-[hsl(var(--sidebar-background))] shadow-sm dark:border-white/10 dark:bg-white/5">
        <CardHeader className="flex flex-col gap-4 overflow-hidden p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6 sm:pb-5">
          <CardTitle className="w-full min-w-0 flex-1 truncate text-xl font-semibold text-foreground sm:w-auto">
            {projectName}
          </CardTitle>
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            {user && projectId ? (
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
                  className: "w-full justify-center gap-2 sm:w-auto sm:min-w-[12rem]",
                  inactiveClassName:
                    "border-border hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-border dark:hover:border-white/15 dark:hover:bg-white/10 dark:hover:text-primary",
                })}
                aria-pressed={isWorkflowPromptOpen}
              >
                <Sparkles className="h-4 w-4" />
                {isWorkflowPromptOpen ? "Close AI Workflow" : "Generate AI Workflow"}
              </Button>
            ) : null}
            {user && projectId ? (
              <Button
                type="button"
                onClick={() => onInvite(projectId)}
                variant="default"
                className="w-full justify-center gap-2 sm:w-auto"
              >
                <UserPlus2 className="h-4 w-4" />
                Invite
              </Button>
            ) : null}
            {canManageProject ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={openProjectSettings}
                className={getNavItemHighlightClasses({
                  isActive: Boolean(settingsProject),
                  className: "h-10 w-10 self-center sm:self-auto",
                  inactiveClassName:
                    "border-border hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-border dark:hover-border-white/15 dark:hover:bg-white/10 dark:hover:text-primary",
                })}
                disabled={!currentProject}
                aria-pressed={Boolean(settingsProject)}
              >
                <Settings className="h-4 w-4" />
                <span className="sr-only">Project settings</span>
              </Button>
            ) : null}
          </div>
        </CardHeader>
        {user && projectId && isWorkflowPromptOpen ? (
          <CardContent className="border-t border-border/60 pt-4">
            <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-primary">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Describe the workflow you need</p>
                <p className="text-xs text-primary/80">
                  Mention goals, hand-offs, or constraints. We'll suggest stage names in order and add them to your board.
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
              {workflowPromptError ? (
                <p className="text-sm text-destructive">{workflowPromptError}</p>
              ) : null}
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
          </CardContent>
        ) : null}
      </Card>
      <div className="pb-4 min-w-0">
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

      <Dialog
        open={Boolean(settingsProject)}
        onOpenChange={(open) => {
          if (!open && !settingsSubmitting && !deleteSubmitting) {
            resetSettingsState();
          }
        }}
      >
        {settingsProject ? (
          <DialogContent className="max-w-lg space-y-6">
            <DialogHeader>
              <DialogTitle>Edit project</DialogTitle>
              <DialogDescription>Update project details and visibility.</DialogDescription>
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
                  <Input
                    id="project-settings-name"
                    value={settingsName}
                    onChange={(event) => setSettingsName(event.target.value.slice(0, NAME_MAX_LENGTH))}
                    maxLength={NAME_MAX_LENGTH}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {settingsName.length}/{NAME_MAX_LENGTH}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-settings-description">Description</Label>
                  <Textarea
                    id="project-settings-description"
                    value={settingsDescription}
                    onChange={(event) =>
                      setSettingsDescription(event.target.value.slice(0, DESCRIPTION_MAX_LENGTH))
                    }
                    maxLength={DESCRIPTION_MAX_LENGTH}
                    className="min-h-[140px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    {settingsDescription.length}/{DESCRIPTION_MAX_LENGTH}
                  </p>
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
                <Button type="submit" disabled={settingsSubmitting || deleteSubmitting}>
                  {settingsSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save changes
                </Button>
              </DialogFooter>

              <div className="space-y-4 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex w-full items-center justify-between text-destructive"
                  onClick={() => setShowDanger((prev) => !prev)}
                >
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Danger zone
                  </span>
                  <span className="text-xs">{showDanger ? "Hide" : "Show"}</span>
                </Button>
                {showDanger ? (
                  <div className="space-y-3 border-t border-destructive/30 pt-3 text-sm text-destructive">
                    <p>
                      Deleting <span className="font-semibold">{settingsProject.name}</span> is permanent and removes
                      all of its tasks.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="project-delete-confirm">Type DELETE to confirm</Label>
                      <Input
                        id="project-delete-confirm"
                        value={deleteConfirmation}
                        onChange={(event) => setDeleteConfirmation(event.target.value)}
                        placeholder="DELETE"
                        className="border-destructive/30 focus-visible:ring-destructive"
                      />
                    </div>
                    {deleteError ? <p className="text-xs text-destructive">{deleteError}</p> : null}
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => void handleProjectDelete()}
                      disabled={
                        deleteSubmitting || deleteConfirmation.trim().toUpperCase() !== "DELETE"
                      }
                      className="flex items-center gap-2"
                    >
                      {deleteSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Trash2 className="h-4 w-4" />
                      Delete project
                    </Button>
                  </div>
                ) : null}
              </div>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>

    </div>
  );
}
