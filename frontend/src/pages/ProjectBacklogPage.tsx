import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";
import type { Backlog, Project, Task, TaskStatus } from "@shared/types";
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  Input,
  Label,
  Textarea,
} from "../components/ui";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import { BacklogTaskTable, type BacklogTaskRow } from "../components/Backlog/BacklogTaskTable";
import {
  GET_PROJECT,
  GET_TASKS,
  ADD_BACKLOG,
  CREATE_TASK,
  UPDATE_TASK,
  DELETE_TASK,
  REORDER_BACKLOG_TASKS,
} from "../graphql";

type ProjectBacklogPageProps = {
  setSelectedTask: (task: Task) => void;
};

type ProjectQueryResult = {
  project: Project | null;
};

type TasksQueryResult = {
  tasks: Task[];
};

const UNASSIGNED_BACKLOG_ID = "__UNASSIGNED__";

export function ProjectBacklogPage({ setSelectedTask }: ProjectBacklogPageProps) {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? null;

  const [selectedBacklogId, setSelectedBacklogId] = useState<string>(UNASSIGNED_BACKLOG_ID);
  const [isCreateBacklogOpen, setIsCreateBacklogOpen] = useState(false);
  const [createBacklogName, setCreateBacklogName] = useState("");
  const [createBacklogDescription, setCreateBacklogDescription] = useState("");
  const [createBacklogSubmitting, setCreateBacklogSubmitting] = useState(false);
  const [createBacklogError, setCreateBacklogError] = useState<string | null>(null);

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createTaskTitle, setCreateTaskTitle] = useState("");
  const [createTaskDescription, setCreateTaskDescription] = useState("");
  const [createTaskSprintId, setCreateTaskSprintId] = useState<string>("");
  const [createTaskSubmitting, setCreateTaskSubmitting] = useState(false);
  const [createTaskError, setCreateTaskError] = useState<string | null>(null);

  const [taskActionError, setTaskActionError] = useState<string | null>(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<Set<string>>(new Set());
  const [deletingTaskIds, setDeletingTaskIds] = useState<Set<string>>(new Set());
  const [isReorderingTasks, setIsReorderingTasks] = useState(false);

  const { data: projectData, loading, error, refetch: refetchProject } = useQuery<ProjectQueryResult>(GET_PROJECT, {
    variables: projectId ? { id: projectId } : undefined,
    skip: !projectId,
    fetchPolicy: "network-only",
    nextFetchPolicy: "cache-first",
  });

  const project = projectData?.project ?? null;
  const primaryTeam = project?.teams?.[0] ?? null;
  const backlogs = primaryTeam?.backlogs ?? [];
  const sprints = primaryTeam?.sprints ?? [];
  const teamIdForBacklog = primaryTeam?.id ?? null;

  useEffect(() => {
    if (backlogs.length === 0) {
      setSelectedBacklogId(UNASSIGNED_BACKLOG_ID);
      return;
    }
    setSelectedBacklogId((current) => {
      if (current !== UNASSIGNED_BACKLOG_ID && backlogs.some((backlog) => backlog.id === current)) {
        return current;
      }
      return backlogs[0]?.id ?? UNASSIGNED_BACKLOG_ID;
    });
  }, [backlogs]);

  const isUnassignedView = selectedBacklogId === UNASSIGNED_BACKLOG_ID;

  const {
    data: tasksData,
    loading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
  } = useQuery<TasksQueryResult>(GET_TASKS, {
    variables: projectId
      ? {
          project_id: projectId,
          team_id: teamIdForBacklog,
          stage_id: null,
          backlog_id: isUnassignedView ? null : selectedBacklogId,
        }
      : undefined,
    skip: !projectId,
    fetchPolicy: "network-only",
  });

  const tasks = tasksData?.tasks ?? [];

  const rows = useMemo<BacklogTaskRow[]>(() => {
    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status ?? "new",
      estimate: task.estimate ?? null,
      sprintName: task.sprint?.name ?? null,
      order: task.position ?? null,
      createdAt: task.created_at ?? null,
      updatedAt: task.updated_at ?? null,
      isUpdating: updatingTaskIds.has(task.id),
      isDeleting: deletingTaskIds.has(task.id),
    }));
  }, [tasks, updatingTaskIds, deletingTaskIds]);

  const [addBacklog] = useMutation(ADD_BACKLOG);
  const [createTaskMutation] = useMutation(CREATE_TASK);
  const [updateTaskMutation] = useMutation(UPDATE_TASK);
  const [deleteTaskMutation] = useMutation(DELETE_TASK);
  const [reorderBacklogTasksMutation] = useMutation(REORDER_BACKLOG_TASKS);

  const selectedBacklog = isUnassignedView ? null : backlogs.find((backlog) => backlog.id === selectedBacklogId) ?? null;

  const backlogDropdownLabel = selectedBacklog
    ? selectedBacklog.name
    : backlogs.length
    ? "Unassigned tasks"
    : "Backlog";

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
    setCreateTaskSprintId("");
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
      await refetchProject();
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

  const handleCreateTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectId) {
      setCreateTaskError("Project context is missing.");
      return;
    }
    if (!teamIdForBacklog) {
      setCreateTaskError("Team context is missing.");
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
      await createTaskMutation({
        variables: {
          project_id: projectId,
          team_id: teamIdForBacklog,
          stage_id: null,
          backlog_id: isUnassignedView ? null : selectedBacklogId,
          sprint_id: createTaskSprintId || null,
          title: trimmedTitle,
          description: createTaskDescription.trim() || null,
          status: "new",
        },
      });
      await Promise.all([refetchTasks(), refetchProject()]);
      setIsCreateTaskOpen(false);
      setCreateTaskTitle("");
      setCreateTaskDescription("");
      setCreateTaskSprintId("");
    } catch (mutationError) {
      setCreateTaskError((mutationError as Error).message ?? "Unable to add task to backlog.");
    } finally {
      setCreateTaskSubmitting(false);
    }
  };

  const setTaskUpdating = useCallback((taskId: string, next: boolean) => {
    setUpdatingTaskIds((prev) => {
      const nextSet = new Set(prev);
      if (next) {
        nextSet.add(taskId);
      } else {
        nextSet.delete(taskId);
      }
      return nextSet;
    });
  }, []);

  const setTaskDeleting = useCallback((taskId: string, next: boolean) => {
    setDeletingTaskIds((prev) => {
      const nextSet = new Set(prev);
      if (next) {
        nextSet.add(taskId);
      } else {
        nextSet.delete(taskId);
      }
      return nextSet;
    });
  }, []);

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    setTaskActionError(null);
    setTaskUpdating(taskId, true);
    try {
      await updateTaskMutation({
        variables: {
          id: taskId,
          status,
          stage_id: null,
          backlog_id: isUnassignedView ? null : selectedBacklogId,
        },
      });
      await refetchTasks();
    } catch (mutationError) {
      setTaskActionError((mutationError as Error).message ?? "Unable to update task status.");
    } finally {
      setTaskUpdating(taskId, false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setTaskActionError(null);
    setTaskDeleting(taskId, true);
    try {
      await deleteTaskMutation({ variables: { id: taskId } });
      await refetchTasks();
    } catch (mutationError) {
      setTaskActionError((mutationError as Error).message ?? "Unable to delete task.");
    } finally {
      setTaskDeleting(taskId, false);
    }
  };

  const handleReorderTasks = useCallback(
    async (orderedIds: string[]) => {
      if (!projectId || !teamIdForBacklog || orderedIds.length === 0 || isReorderingTasks) {
        return;
      }

      const backlogId = isUnassignedView ? null : selectedBacklogId;

      setTaskActionError(null);
      setIsReorderingTasks(true);

      try {
        await reorderBacklogTasksMutation({
          variables: {
            project_id: projectId,
            team_id: teamIdForBacklog,
            backlog_id: backlogId,
            task_ids: orderedIds,
          },
        });
        await refetchTasks();
      } catch (mutationError) {
        setTaskActionError((mutationError as Error).message ?? "Unable to reorder tasks.");
        throw mutationError;
      } finally {
        setIsReorderingTasks(false);
      }
    },
    [
      projectId,
      teamIdForBacklog,
      isUnassignedView,
      selectedBacklogId,
      isReorderingTasks,
      reorderBacklogTasksMutation,
      refetchTasks,
    ]
  );

  const handleTaskSelect = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    setSelectedTask(task);
  };

  if (!projectId) {
    return <div className="p-6 text-destructive">Project identifier is missing.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading project backlog…
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertTitle>Unable to load project</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!project) {
    return <div className="p-6 text-destructive">We couldn&apos;t find that project.</div>;
  }

  const canManageBacklogs = Boolean(
    project.viewer_role === "owner" || project.viewer_role === "admin" || project.viewer_is_owner
  );

  const backlogOptions = [
    { id: UNASSIGNED_BACKLOG_ID, name: "Unassigned tasks" },
    ...backlogs,
  ];

  return (
    <div className="space-y-6 pb-10">
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
                {backlogOptions.map((backlogOption) => (
                  <DropdownMenuItem
                    key={backlogOption.id}
                    onSelect={(event) => {
                      event.preventDefault();
                      setSelectedBacklogId(backlogOption.id);
                    }}
                    className={
                      backlogOption.id === selectedBacklogId
                        ? "bg-primary/5 text-primary focus:bg-primary/5 focus:text-primary"
                        : undefined
                    }
                  >
                    {backlogOption.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {selectedBacklog?.description ? (
              <p className="text-sm text-muted-foreground">{selectedBacklog.description}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <Button type="button" className="gap-2" onClick={openCreateTaskDialog}>
              <Plus className="h-4 w-4" />
              New backlog task
            </Button>
            {canManageBacklogs ? (
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
          {tasksError ? (
            <Alert variant="destructive" className="mb-3">
              <AlertTitle>Unable to load backlog tasks</AlertTitle>
              <AlertDescription>{tasksError.message}</AlertDescription>
            </Alert>
          ) : null}
          {tasksLoading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading tasks…
            </div>
          ) : (
            <BacklogTaskTable
              rows={rows}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteTask}
              onSelect={handleTaskSelect}
              onReorder={handleReorderTasks}
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isCreateBacklogOpen}
        onOpenChange={(open) => {
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
        onOpenChange={(open) => {
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
              Capture work items here before promoting them onto a board.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateTask}>
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
            <div className="space-y-2">
              <Label htmlFor="backlog-task-sprint">Sprint</Label>
              <select
                id="backlog-task-sprint"
                value={createTaskSprintId}
                onChange={(event) => setCreateTaskSprintId(event.target.value)}
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
                disabled={createTaskSubmitting || sprints.length === 0}
              >
                <option value="">No sprint</option>
                {sprints.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name}
                  </option>
                ))}
              </select>
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
              <Button type="submit" disabled={createTaskSubmitting} className="gap-2">
                {createTaskSubmitting ? "Adding…" : "Add task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
