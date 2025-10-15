import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@apollo/client";
import type { Project, Task } from "@shared/types";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../components/ui";
import { ChevronDown, Loader2, Plus } from "lucide-react";

import { BacklogTaskTable, type BacklogTaskRow } from "../components/Backlog/BacklogTaskTable";
import { CreateBacklogDialog } from "../components/Backlog/CreateBacklogDialog";
import { CreateBacklogTaskDialog } from "../components/Backlog/CreateBacklogTaskDialog";
import { GET_PROJECT, GET_TASKS } from "../graphql";
import { useBacklogCreation } from "../hooks/useBacklogCreation";
import { useBacklogTaskActions } from "../hooks/useBacklogTaskActions";

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

  const {
    data: projectData,
    loading,
    error,
    refetch: refetchProject,
  } = useQuery<ProjectQueryResult>(GET_PROJECT, {
    variables: projectId ? { id: projectId } : undefined,
    skip: !projectId,
    fetchPolicy: "network-only",
    nextFetchPolicy: "cache-first",
  });

  const project = projectData?.project ?? null;
  const backlogs = useMemo(() => project?.backlogs ?? [], [project?.backlogs]);
  const sprints = useMemo(() => project?.sprints ?? [], [project?.sprints]);
  const teamIdForBacklog = project?.team_id ?? null;

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
          stage_id: null,
          backlog_id: isUnassignedView ? null : selectedBacklogId,
        }
      : undefined,
    skip: !projectId,
    fetchPolicy: "network-only",
  });

  const { backlogDialog, taskDialog } = useBacklogCreation({
    projectId,
    teamId: teamIdForBacklog,
    selectedBacklogId,
    isUnassignedView,
    refetchProject,
    refetchTasks,
    onBacklogCreated: setSelectedBacklogId,
  });

  const {
    taskActionError,
    dismissTaskActionError,
    updatingTaskIds,
    deletingTaskIds,
    isReorderingTasks,
    handleStatusChange,
    handleDeleteTask,
    handleReorderTasks,
  } = useBacklogTaskActions({
    projectId,
    selectedBacklogId,
    isUnassignedView,
    refetchTasks,
  });

  useEffect(() => {
    dismissTaskActionError();
  }, [dismissTaskActionError, selectedBacklogId]);

  const tasks = useMemo(() => tasksData?.tasks ?? [], [tasksData?.tasks]);

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

  const selectedBacklog = isUnassignedView ? null : backlogs.find((backlog) => backlog.id === selectedBacklogId) ?? null;

  const backlogDropdownLabel = selectedBacklog
    ? selectedBacklog.name
    : backlogs.length
    ? "Unassigned tasks"
    : "Backlog";

  const openCreateBacklogDialog = backlogDialog.openDialog;
  const openCreateTaskDialog = taskDialog.openDialog;

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
          {taskActionError ? <p className="mb-3 text-sm text-destructive">{taskActionError}</p> : null}
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
              onStatusChange={(taskId, status) => {
                void handleStatusChange(taskId, status);
              }}
              onDelete={(taskId) => {
                void handleDeleteTask(taskId);
              }}
              onSelect={handleTaskSelect}
              isReordering={isReorderingTasks}
              onReorder={handleReorderTasks}
            />
          )}
        </CardContent>
      </Card>

      <CreateBacklogDialog
        open={backlogDialog.open}
        onOpenChange={backlogDialog.onOpenChange}
        onSubmit={backlogDialog.onSubmit}
        name={backlogDialog.name}
        description={backlogDialog.description}
        onNameChange={backlogDialog.onNameChange}
        onDescriptionChange={backlogDialog.onDescriptionChange}
        isSubmitting={backlogDialog.isSubmitting}
        error={backlogDialog.error}
        closeDialog={backlogDialog.closeDialog}
      />

      <CreateBacklogTaskDialog
        open={taskDialog.open}
        onOpenChange={taskDialog.onOpenChange}
        onSubmit={taskDialog.onSubmit}
        title={taskDialog.title}
        description={taskDialog.description}
        onTitleChange={taskDialog.onTitleChange}
        onDescriptionChange={taskDialog.onDescriptionChange}
        onSprintChange={taskDialog.onSprintChange}
        sprintId={taskDialog.sprintId}
        isSubmitting={taskDialog.isSubmitting}
        error={taskDialog.error}
        closeDialog={taskDialog.closeDialog}
        sprints={sprints}
      />
    </div>
  );
}
