import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";
import type { Project, Backlog, TaskStatus } from "@shared/types";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Input,
  Label,
  Textarea,
} from "../components/ui";
import { GET_PROJECT, ADD_BACKLOG, ADD_BACKLOG_TASK, UPDATE_BACKLOG_TASK, DELETE_BACKLOG_TASK } from "../graphql";
import { ChevronDown, Plus } from "lucide-react";
import { BacklogTaskTable, type BacklogTaskRow } from "../components/Backlog/BacklogTaskTable";

type ProjectQueryResult = {
  project: Project | null;
};

export function ProjectBacklogPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? null;

  const [isCreateBacklogOpen, setIsCreateBacklogOpen] = useState(false);
  const [createBacklogName, setCreateBacklogName] = useState("");
  const [createBacklogDescription, setCreateBacklogDescription] = useState("");
  const [createBacklogSubmitting, setCreateBacklogSubmitting] = useState(false);
  const [createBacklogError, setCreateBacklogError] = useState<string | null>(null);

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createTaskTitle, setCreateTaskTitle] = useState("");
  const [createTaskDescription, setCreateTaskDescription] = useState("");
  const [createTaskSubmitting, setCreateTaskSubmitting] = useState(false);
  const [createTaskError, setCreateTaskError] = useState<string | null>(null);

  const [taskActionError, setTaskActionError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery<ProjectQueryResult>(GET_PROJECT, {
    variables: projectId ? { id: projectId } : undefined,
    skip: !projectId,
    fetchPolicy: "network-only",
    nextFetchPolicy: "cache-first",
  });

  const [addBacklog] = useMutation(ADD_BACKLOG);
  const [addBacklogTask] = useMutation(ADD_BACKLOG_TASK);
  const [updateBacklogTask] = useMutation(UPDATE_BACKLOG_TASK);
  const [deleteBacklogTask] = useMutation(DELETE_BACKLOG_TASK);

  const project = data?.project ?? null;
  const backlogs = useMemo<Backlog[]>(() => project?.backlogs ?? [], [project?.backlogs]);
  const [selectedBacklogId, setSelectedBacklogId] = useState<string | null>(() => {
    return backlogs.length > 0 ? backlogs[0]?.id ?? null : null;
  });

  useEffect(() => {
    if (backlogs.length === 0) {
      setSelectedBacklogId(null);
      return;
    }
    setSelectedBacklogId((current) => {
      if (current && backlogs.some((backlog) => backlog.id === current)) {
        return current;
      }
      return backlogs[0]?.id ?? null;
    });
  }, [backlogs]);

  const selectedBacklog = useMemo<Backlog | null>(() => {
    if (!selectedBacklogId) return null;
    return backlogs.find((backlog) => backlog.id === selectedBacklogId) ?? null;
  }, [backlogs, selectedBacklogId]);

  const backlogTasks = useMemo(() => selectedBacklog?.tasks ?? [], [selectedBacklog?.tasks]);

  const backlogTaskRows = useMemo<BacklogTaskRow[]>(() => {
    return backlogTasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description ?? null,
      status: task.status,
      createdAt: task.created_at ?? null,
      updatedAt: task.updated_at ?? null,
      isUpdating: updatingTaskId === task.id,
      isDeleting: deletingTaskId === task.id,
    }));
  }, [backlogTasks, updatingTaskId, deletingTaskId]);

  const canManageProject = Boolean(
    project?.viewer_role === "owner" || project?.viewer_role === "admin" || project?.viewer_is_owner
  );

  if (!projectId) {
    return <div className="p-6 text-destructive">Project identifier is missing.</div>;
  }

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading backlogs…</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertTitle>Unable to load backlogs</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!project) {
    return <div className="p-6 text-destructive">We couldn&apos;t find that project.</div>;
  }

  const teamIdForBacklog = project.team?.id ?? project.team_id;

  const backlogDropdownLabel = selectedBacklog?.name ?? (backlogs.length === 0 ? "No backlogs" : "Select backlog");

  const openCreateBacklogDialog = () => {
    setCreateBacklogError(null);
    setCreateBacklogName("");
    setCreateBacklogDescription("");
    setIsCreateBacklogOpen(true);
  };

  const openCreateTaskDialog = () => {
    setCreateTaskError(null);
    setCreateTaskTitle("");
    setCreateTaskDescription("");
    setIsCreateTaskOpen(true);
  };

  const handleCreateBacklog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!teamIdForBacklog) {
      setCreateBacklogError("Team context is missing.");
      return;
    }
    const trimmedName = createBacklogName.trim();
    if (!trimmedName) {
      setCreateBacklogError("Backlog name is required.");
      return;
    }

    setCreateBacklogSubmitting(true);
    setCreateBacklogError(null);
    try {
      const result = await addBacklog({
        variables: {
          team_id: teamIdForBacklog,
          name: trimmedName,
          description: createBacklogDescription.trim() || null,
        },
        refetchQueries: projectId ? [{ query: GET_PROJECT, variables: { id: projectId } }] : undefined,
        awaitRefetchQueries: true,
      });
      await refetch();
      const createdBacklog = (result.data?.addBacklog ?? null) as Backlog | null;
      if (createdBacklog?.id) {
        setSelectedBacklogId(createdBacklog.id);
      }
      setIsCreateBacklogOpen(false);
      setCreateBacklogName("");
      setCreateBacklogDescription("");
    } catch (mutationError) {
      setCreateBacklogError((mutationError as Error).message ?? "Unable to create backlog.");
    } finally {
      setCreateBacklogSubmitting(false);
    }
  };

  const handleCreateBacklogTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBacklogId) {
      setCreateTaskError("Select a backlog first.");
      return;
    }
    const trimmedTitle = createTaskTitle.trim();
    if (!trimmedTitle) {
      setCreateTaskError("Task title is required.");
      return;
    }

    setCreateTaskSubmitting(true);
    setCreateTaskError(null);
    try {
      await addBacklogTask({
        variables: {
          backlog_id: selectedBacklogId,
          title: trimmedTitle,
          description: createTaskDescription.trim() || null,
        },
        refetchQueries: projectId ? [{ query: GET_PROJECT, variables: { id: projectId } }] : undefined,
        awaitRefetchQueries: true,
      });
      await refetch();
      setIsCreateTaskOpen(false);
      setCreateTaskTitle("");
      setCreateTaskDescription("");
    } catch (mutationError) {
      setCreateTaskError((mutationError as Error).message ?? "Unable to add task to backlog.");
    } finally {
      setCreateTaskSubmitting(false);
    }
  };

  const handleTaskStatusChange = async (taskId: string, status: TaskStatus) => {
    setTaskActionError(null);
    setUpdatingTaskId(taskId);
    try {
      await updateBacklogTask({
        variables: { id: taskId, status },
        refetchQueries: projectId ? [{ query: GET_PROJECT, variables: { id: projectId } }] : undefined,
        awaitRefetchQueries: true,
      });
      await refetch();
    } catch (mutationError) {
      setTaskActionError((mutationError as Error).message ?? "Unable to update task status.");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    setTaskActionError(null);
    setDeletingTaskId(taskId);
    try {
      await deleteBacklogTask({
        variables: { id: taskId },
        refetchQueries: projectId ? [{ query: GET_PROJECT, variables: { id: projectId } }] : undefined,
        awaitRefetchQueries: true,
      });
      await refetch();
    } catch (mutationError) {
      setTaskActionError((mutationError as Error).message ?? "Unable to delete task.");
    } finally {
      setDeletingTaskId(null);
    }
  };

  const renderEmptyBacklogsState = () => (
    <Card className="border-border/80">
      <CardHeader className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Start a backlog</h2>
          <p className="text-sm text-muted-foreground">
            Create a backlog to capture work ideas before pulling them into a workflow.
          </p>
        </div>
        {canManageProject ? (
          <Button type="button" variant="outline" className="gap-2 self-start" onClick={openCreateBacklogDialog}>
            <Plus className="h-4 w-4" />
            New backlog
          </Button>
        ) : null}
      </CardHeader>
    </Card>
  );

  return (
    <div className="space-y-6 pb-10">
      {backlogs.length === 0 ? (
        renderEmptyBacklogsState()
      ) : (
        <Card className="border-border/80">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex w-full flex-col gap-2 lg:max-w-sm">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="inline-flex w-full items-center justify-between gap-2 rounded-xl border-border/70 bg-background/80 px-4 py-2 text-left text-sm font-medium text-foreground shadow-sm transition hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                  >
                    <span className="truncate">{backlogDropdownLabel}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>Select backlog</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={selectedBacklogId ?? backlogs[0]?.id ?? ""}
                    onValueChange={(value) => setSelectedBacklogId(value)}
                  >
                    {backlogs.map((backlog) => (
                      <DropdownMenuRadioItem key={backlog.id} value={backlog.id}>
                        {backlog.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              {selectedBacklog?.description ? (
                <p className="text-sm text-muted-foreground">{selectedBacklog.description}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              {selectedBacklog ? (
                <Button type="button" className="gap-2" onClick={openCreateTaskDialog}>
                  <Plus className="h-4 w-4" />
                  New backlog task
                </Button>
              ) : null}
              {canManageProject ? (
                <Button type="button" variant="outline" className="gap-2" onClick={openCreateBacklogDialog}>
                  <Plus className="h-4 w-4" />
                  New backlog
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {taskActionError ? (
              <p className="mb-3 text-sm text-destructive">{taskActionError}</p>
            ) : null}
            <BacklogTaskTable
              rows={backlogTaskRows}
              onStatusChange={handleTaskStatusChange}
              onDelete={handleTaskDelete}
            />
          </CardContent>
        </Card>
      )}

      <Dialog
        open={isCreateBacklogOpen}
        onOpenChange={(open: boolean) => {
          if (!open && !createBacklogSubmitting) {
            setIsCreateBacklogOpen(open);
            setCreateBacklogError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create backlog</DialogTitle>
            <DialogDescription>
              Give your backlog a clear name and optional description. You can reorder and refine later.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateBacklog}>
            <div className="space-y-2">
              <Label htmlFor="backlog-name">Name</Label>
              <Input
                id="backlog-name"
                value={createBacklogName}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setCreateBacklogName(event.target.value)}
                placeholder="e.g. Product backlog"
                maxLength={120}
                autoFocus
                disabled={createBacklogSubmitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="backlog-description">Description</Label>
              <Textarea
                id="backlog-description"
                value={createBacklogDescription}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setCreateBacklogDescription(event.target.value)
                }
                placeholder="Optional context for this backlog"
                className="min-h-[120px]"
                disabled={createBacklogSubmitting}
              />
            </div>
            {createBacklogError ? <p className="text-sm text-destructive">{createBacklogError}</p> : null}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (createBacklogSubmitting) return;
                  setIsCreateBacklogOpen(false);
                  setCreateBacklogError(null);
                }}
                disabled={createBacklogSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createBacklogSubmitting} className="gap-2">
                {createBacklogSubmitting ? "Creating…" : "Create backlog"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCreateTaskOpen}
        onOpenChange={(open: boolean) => {
          if (!open && !createTaskSubmitting) {
            setIsCreateTaskOpen(open);
            setCreateTaskError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add backlog task</DialogTitle>
            <DialogDescription>
              Capture work items here before promoting them into a workflow.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateBacklogTask}>
            <div className="space-y-2">
              <Label htmlFor="backlog-task-title">Title</Label>
              <Input
                id="backlog-task-title"
                value={createTaskTitle}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setCreateTaskTitle(event.target.value)}
                placeholder="e.g. Research customer feedback"
                maxLength={256}
                autoFocus
                disabled={createTaskSubmitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="backlog-task-description">Description</Label>
              <Textarea
                id="backlog-task-description"
                value={createTaskDescription}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setCreateTaskDescription(event.target.value)
                }
                placeholder="Optional context for this task"
                className="min-h-[120px]"
                disabled={createTaskSubmitting}
              />
            </div>
            {createTaskError ? <p className="text-sm text-destructive">{createTaskError}</p> : null}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (createTaskSubmitting) return;
                  setIsCreateTaskOpen(false);
                  setCreateTaskError(null);
                }}
                disabled={createTaskSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTaskSubmitting || !selectedBacklogId} className="gap-2">
                {createTaskSubmitting ? "Adding…" : "Add task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
