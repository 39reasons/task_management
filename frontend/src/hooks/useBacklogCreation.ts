import { useCallback, useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation } from "@apollo/client";

import { ADD_BACKLOG, CREATE_TASK, GET_PROJECT } from "../graphql";

import type { Backlog } from "@shared/types";

interface UseBacklogCreationOptions {
  projectId: string | null;
  teamId: string | null;
  selectedBacklogId: string;
  isUnassignedView: boolean;
  refetchProject: () => Promise<unknown>;
  refetchTasks: () => Promise<unknown>;
  onBacklogCreated: (backlogId: string) => void;
}

interface BaseDialogState {
  open: boolean;
  error: string | null;
  isSubmitting: boolean;
}

export interface BacklogDialogState extends BaseDialogState {
  name: string;
  description: string;
  openDialog: () => void;
  closeDialog: () => void;
  onOpenChange: (open: boolean) => void;
  onNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export interface TaskDialogState extends BaseDialogState {
  title: string;
  description: string;
  sprintId: string;
  openDialog: () => void;
  closeDialog: () => void;
  onOpenChange: (open: boolean) => void;
  onTitleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onSprintChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

interface UseBacklogCreationResult {
  backlogDialog: BacklogDialogState;
  taskDialog: TaskDialogState;
}

export function useBacklogCreation({
  projectId,
  teamId,
  selectedBacklogId,
  isUnassignedView,
  refetchProject,
  refetchTasks,
  onBacklogCreated,
}: UseBacklogCreationOptions): UseBacklogCreationResult {
  const [addBacklog] = useMutation(ADD_BACKLOG);
  const [createTaskMutation] = useMutation(CREATE_TASK);

  const [isBacklogDialogOpen, setIsBacklogDialogOpen] = useState(false);
  const [backlogName, setBacklogName] = useState("");
  const [backlogDescription, setBacklogDescription] = useState("");
  const [isBacklogSubmitting, setIsBacklogSubmitting] = useState(false);
  const [backlogError, setBacklogError] = useState<string | null>(null);

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskSprintId, setTaskSprintId] = useState("");
  const [isTaskSubmitting, setIsTaskSubmitting] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  const resetBacklogForm = useCallback(() => {
    setBacklogName("");
    setBacklogDescription("");
    setBacklogError(null);
  }, []);

  const resetTaskForm = useCallback(() => {
    setTaskTitle("");
    setTaskDescription("");
    setTaskSprintId("");
    setTaskError(null);
  }, []);

  const handleBacklogSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!teamId) {
        setBacklogError("Team context is missing.");
        return;
      }

      const trimmedName = backlogName.trim();
      if (!trimmedName) {
        setBacklogError("Backlog name is required.");
        return;
      }

      setIsBacklogSubmitting(true);
      setBacklogError(null);
      try {
        const result = await addBacklog({
          variables: {
            team_id: teamId,
            name: trimmedName,
            description: backlogDescription.trim() || null,
          },
          refetchQueries: projectId ? [{ query: GET_PROJECT, variables: { id: projectId } }] : undefined,
          awaitRefetchQueries: true,
        });
        await refetchProject();
        const createdBacklog = (result.data?.addBacklog ?? null) as Backlog | null;
        if (createdBacklog?.id) {
          onBacklogCreated(createdBacklog.id);
        }
        setIsBacklogDialogOpen(false);
        resetBacklogForm();
      } catch (mutationError) {
        setBacklogError((mutationError as Error).message ?? "Unable to create backlog.");
      } finally {
        setIsBacklogSubmitting(false);
      }
    },
    [
      addBacklog,
      backlogDescription,
      backlogName,
      onBacklogCreated,
      projectId,
      refetchProject,
      resetBacklogForm,
      teamId,
    ]
  );

  const handleTaskSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!projectId) {
        setTaskError("Project context is missing.");
        return;
      }

      if (!teamId) {
        setTaskError("Team context is missing.");
        return;
      }

      const trimmedTitle = taskTitle.trim();
      if (!trimmedTitle) {
        setTaskError("Task title is required.");
        return;
      }

      setIsTaskSubmitting(true);
      setTaskError(null);
      try {
        await createTaskMutation({
          variables: {
            project_id: projectId,
            team_id: teamId,
            stage_id: null,
            backlog_id: isUnassignedView ? null : selectedBacklogId,
            sprint_id: taskSprintId || null,
            title: trimmedTitle,
            description: taskDescription.trim() || null,
            status: "new",
          },
        });
        await Promise.all([refetchTasks(), refetchProject()]);
        setIsTaskDialogOpen(false);
        resetTaskForm();
      } catch (mutationError) {
        setTaskError((mutationError as Error).message ?? "Unable to add task to backlog.");
      } finally {
        setIsTaskSubmitting(false);
      }
    },
    [
      createTaskMutation,
      isUnassignedView,
      projectId,
      teamId,
      refetchProject,
      refetchTasks,
      resetTaskForm,
      selectedBacklogId,
      taskDescription,
      taskSprintId,
      taskTitle,
    ]
  );

  const backlogDialog: BacklogDialogState = {
    open: isBacklogDialogOpen,
    error: backlogError,
    isSubmitting: isBacklogSubmitting,
    name: backlogName,
    description: backlogDescription,
    openDialog: () => {
      resetBacklogForm();
      setIsBacklogDialogOpen(true);
    },
    closeDialog: () => {
      if (isBacklogSubmitting) return;
      setIsBacklogDialogOpen(false);
      setBacklogError(null);
    },
    onOpenChange: (open) => {
      if (!open && isBacklogSubmitting) {
        return;
      }
      setIsBacklogDialogOpen(open);
      if (!open) {
        setBacklogError(null);
      }
    },
    onNameChange: (event) => setBacklogName(event.target.value),
    onDescriptionChange: (event) => setBacklogDescription(event.target.value),
    onSubmit: handleBacklogSubmit,
  };

  const taskDialog: TaskDialogState = {
    open: isTaskDialogOpen,
    error: taskError,
    isSubmitting: isTaskSubmitting,
    title: taskTitle,
    description: taskDescription,
    sprintId: taskSprintId,
    openDialog: () => {
      resetTaskForm();
      setIsTaskDialogOpen(true);
    },
    closeDialog: () => {
      if (isTaskSubmitting) return;
      setIsTaskDialogOpen(false);
      setTaskError(null);
    },
    onOpenChange: (open) => {
      if (!open && isTaskSubmitting) {
        return;
      }
      setIsTaskDialogOpen(open);
      if (!open) {
        setTaskError(null);
      }
    },
    onTitleChange: (event) => setTaskTitle(event.target.value),
    onDescriptionChange: (event) => setTaskDescription(event.target.value),
    onSprintChange: (event) => setTaskSprintId(event.target.value),
    onSubmit: handleTaskSubmit,
  };

  return {
    backlogDialog,
    taskDialog,
  };
}
