import { useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { gql, useApolloClient, useMutation, useQuery } from "@apollo/client";
import {
  GET_WORKFLOWS,
  CREATE_TASK,
  DELETE_TASK,
  UPDATE_TASK,
  UPDATE_TASK_PRIORITY,
  MOVE_TASK,
  ADD_STAGE,
  DELETE_STAGE,
  REORDER_TASKS,
  GET_TASK_TAGS,
} from "../graphql";
import type { Stage, Task, Workflow } from "@shared/types";
import type {
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskReorderedEvent,
  TaskUpdatedEvent,
} from "../realtime/types";
import { useTaskRealtime } from "./useTaskRealtime";

const TASK_CACHE_FRAGMENT = gql`
  fragment TaskRealtimeFields on Task {
    id
    title
    description
    due_date
    priority
    stage_id
    project_id
    position
    assignees {
      id
      first_name
      last_name
      username
      avatar_color
    }
    tags {
      id
      name
      color
    }
  }
`;

function normalizeTaskForCache(task: Task) {
  return {
    ...task,
    __typename: "Task" as const,
    tags: (task.tags ?? []).map((tag) => ({
      ...tag,
      __typename: "Tag" as const,
    })) as unknown as Task["tags"],
    assignees: (task.assignees ?? []).map((user) => ({
      ...user,
      __typename: "User" as const,
    })) as unknown as Task["assignees"],
  };
}

interface UseProjectBoardResult {
  projectId: string | null;
  workflow: Workflow | null;
  stages: Stage[];
  loading: boolean;
  error: unknown;
  createTask: (stage_id: string, title: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (task_id: string, to_stage_id: string) => Promise<void>;
  updateTask: (input: Partial<Task> & { id: string }) => Promise<void>;
  updatePriority: (id: string, priority: Task["priority"]) => Promise<void>;
  addStage: (name: string) => Promise<void>;
  reorderStage: (stage_id: string, task_ids: string[]) => Promise<void>;
  deleteStage: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useProjectBoard(): UseProjectBoardResult {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? null;
  const client = useApolloClient();

  const {
    data,
    loading,
    error,
    refetch,
  } = useQuery<{ workflows: Workflow[] }>(GET_WORKFLOWS, {
    variables: { project_id: projectId },
    skip: !projectId,
    fetchPolicy: "network-only",
    nextFetchPolicy: "cache-first",
  });

  const workflow = useMemo(() => data?.workflows?.[0] ?? null, [data]);
  const stages = useMemo(() => workflow?.stages ?? [], [workflow]);

  const refetchBoard = useCallback(async () => {
    if (!projectId) {
      return;
    }

    await refetch({ project_id: projectId });
  }, [projectId, refetch]);

  const [createTaskMutation] = useMutation(CREATE_TASK);
  const [deleteTaskMutation] = useMutation(DELETE_TASK);
  const [moveTaskMutation] = useMutation(MOVE_TASK);
  const [updateTaskMutation] = useMutation(UPDATE_TASK);
  const [updatePriorityMutation] = useMutation(UPDATE_TASK_PRIORITY);
  const [addStageMutation] = useMutation(ADD_STAGE);
  const [deleteStageMutation] = useMutation(DELETE_STAGE);
  const [reorderTasksMutation] = useMutation(REORDER_TASKS);

  const handleRealtimeReorder = useCallback(
    (event: TaskReorderedEvent) => {
      if (!projectId) {
        return;
      }

      let missingTask = false;

      client.cache.updateQuery<{ workflows: Workflow[] }>(
        { query: GET_WORKFLOWS, variables: { project_id: projectId } },
        (existing) => {
          if (!existing) {
            missingTask = true;
            return existing;
          }

          const workflows = existing.workflows.map((workflow) => {
            if (workflow.project_id !== event.project_id) {
              return workflow;
            }

            const stageIds = new Set(workflow.stages.map((stage) => stage.id));
            if (!stageIds.has(event.stage_id)) {
              return workflow;
            }

            const taskLookup = new Map<string, Task>();
            for (const stage of workflow.stages) {
              for (const task of stage.tasks) {
                taskLookup.set(task.id, task);
              }
            }

            const movedTaskIds = new Set(event.task_ids);
            let stagesChanged = false;

            const nextStages = workflow.stages.map((stage) => {
              if (stage.id === event.stage_id) {
                const reorderedTasks: Task[] = [];

                event.task_ids.forEach((taskId, position) => {
                  let existingTask = taskLookup.get(taskId);
                  if (!existingTask) {
                    const cacheId = client.cache.identify({ __typename: "Task", id: taskId });
                    if (cacheId) {
                      const cacheTask = client.cache.readFragment<Task>({
                        id: cacheId,
                        fragment: TASK_CACHE_FRAGMENT,
                      });
                      if (cacheTask) {
                        existingTask = cacheTask;
                        taskLookup.set(taskId, cacheTask);
                      }
                    }
                  }
                  if (!existingTask) {
                    missingTask = true;
                    return;
                  }

                  const nextTask =
                    existingTask.stage_id === stage.id && existingTask.position === position
                      ? existingTask
                      : {
                          ...existingTask,
                          stage_id: stage.id,
                          position,
                        };

                  reorderedTasks.push(nextTask);
                });

                if (missingTask) {
                  return stage;
                }

                if (
                  reorderedTasks.length === stage.tasks.length &&
                  reorderedTasks.every(
                    (task, index) =>
                      task.id === stage.tasks[index]?.id && task.position === stage.tasks[index]?.position
                  )
                ) {
                  return stage;
                }

                stagesChanged = true;
                return {
                  ...stage,
                  tasks: reorderedTasks,
                };
              }

              const filteredTasks = stage.tasks.filter((task) => !movedTaskIds.has(task.id));
              if (filteredTasks.length === stage.tasks.length) {
                return stage;
              }

              stagesChanged = true;
              return {
                ...stage,
                tasks: filteredTasks.map((task, position) =>
                  task.position === position
                    ? task
                    : {
                        ...task,
                        position,
                      }
                ),
              };
            });

            if (!stagesChanged) {
              return workflow;
            }

            return {
              ...workflow,
              stages: nextStages,
            };
          });

          if (missingTask) {
            return existing;
          }

          return {
            ...existing,
            workflows,
          };
        }
      );

      if (missingTask) {
        void refetchBoard();
      }
    },
    [client, projectId, refetchBoard]
  );

  const handleTaskCreated = useCallback(
    (event: TaskCreatedEvent) => {
      if (!projectId) {
        return;
      }

      let shouldRefetch = false;
      const taskForCache = normalizeTaskForCache(event.task);

      const cacheId = client.cache.identify({ __typename: "Task", id: event.task.id });
      if (cacheId) {
        client.cache.writeFragment({
          id: cacheId,
          fragment: TASK_CACHE_FRAGMENT,
          data: taskForCache,
        });
      }

      client.cache.updateQuery<{ workflows: Workflow[] }>(
        { query: GET_WORKFLOWS, variables: { project_id: projectId } },
        (existing) => {
          if (!existing) {
            shouldRefetch = true;
            return existing;
          }

          const workflows = existing.workflows.map((workflow) => {
            if (workflow.project_id !== event.project_id) {
              return workflow;
            }

            const stageIndex = workflow.stages.findIndex((stage) => stage.id === event.stage_id);
            if (stageIndex === -1) {
              shouldRefetch = true;
              return workflow;
            }

            const stage = workflow.stages[stageIndex];
            const exists = stage.tasks.some((task) => task.id === event.task.id);
            if (exists) {
              return workflow;
            }

            const nextTasks = [...stage.tasks, taskForCache].sort(
              (a, b) => (a.position ?? 0) - (b.position ?? 0)
            );

            const nextStage = {
              ...stage,
              tasks: nextTasks,
            };

            const nextStages = [...workflow.stages];
            nextStages[stageIndex] = nextStage;

            return {
              ...workflow,
              stages: nextStages,
            };
          });

          return {
            ...existing,
            workflows,
          };
        }
      );

      if (shouldRefetch) {
        void refetchBoard();
      }
    },
    [client, projectId, refetchBoard]
  );

  const handleTaskDeleted = useCallback(
    (event: TaskDeletedEvent) => {
      if (!projectId) {
        return;
      }

      let shouldRefetch = false;

      client.cache.updateQuery<{ workflows: Workflow[] }>(
        { query: GET_WORKFLOWS, variables: { project_id: projectId } },
        (existing) => {
          if (!existing) {
            shouldRefetch = true;
            return existing;
          }

          const workflows = existing.workflows.map((workflow) => {
            if (workflow.project_id !== event.project_id) {
              return workflow;
            }

            const stageIndex = workflow.stages.findIndex((stage) => stage.id === event.stage_id);
            if (stageIndex === -1) {
              shouldRefetch = true;
              return workflow;
            }

            const stage = workflow.stages[stageIndex];
            const filtered = stage.tasks.filter((task) => task.id !== event.task_id);
            if (filtered.length === stage.tasks.length) {
              return workflow;
            }

            const nextStage = {
              ...stage,
              tasks: filtered.map((task, index) =>
                task.position === index
                  ? task
                  : {
                      ...task,
                      position: index,
                    }
              ),
            };

            const nextStages = [...workflow.stages];
            nextStages[stageIndex] = nextStage;

            return {
              ...workflow,
              stages: nextStages,
            };
          });

          return {
            ...existing,
            workflows,
          };
        }
      );

      if (shouldRefetch) {
        void refetchBoard();
      }
    },
    [client, projectId, refetchBoard]
  );

  const handleTaskUpdated = useCallback(
    (event: TaskUpdatedEvent) => {
      if (!projectId) {
        return;
      }

      let shouldRefetch = false;
      const taskForCache = normalizeTaskForCache(event.task);

      const cacheId = client.cache.identify({ __typename: "Task", id: event.task.id });
      if (cacheId) {
        client.cache.writeFragment({
          id: cacheId,
          fragment: TASK_CACHE_FRAGMENT,
          data: taskForCache,
        });
      }

      client.cache.updateQuery<{ workflows: Workflow[] }>(
        { query: GET_WORKFLOWS, variables: { project_id: projectId } },
        (existing) => {
          if (!existing) {
            shouldRefetch = true;
            return existing;
          }

          const workflows = existing.workflows.map((workflow) => {
            if (workflow.project_id !== event.project_id) {
              return workflow;
            }

            let modified = false;
            let destinationFound = false;

            const nextStages = workflow.stages.map((stage) => {
              const withoutTask = stage.tasks.filter((task) => task.id !== event.task.id);
              let tasksChanged = withoutTask.length !== stage.tasks.length;

              if (stage.id === event.stage_id) {
                destinationFound = true;
                const nextTasks = [...withoutTask, taskForCache].sort(
                  (a, b) => (a.position ?? 0) - (b.position ?? 0)
                );
                tasksChanged = true;
                modified = true;
                return {
                  ...stage,
                  tasks: nextTasks,
                };
              }

              if (tasksChanged) {
                modified = true;
                return {
                  ...stage,
                  tasks: withoutTask.map((task, index) =>
                    task.position === index
                      ? task
                      : {
                          ...task,
                          position: index,
                        }
                  ),
                };
              }

              return stage;
            });

            if (!destinationFound) {
              shouldRefetch = true;
              return workflow;
            }

            if (!modified) {
              return workflow;
            }

            return {
              ...workflow,
              stages: nextStages,
            };
          });

          return {
            ...existing,
            workflows,
          };
        }
      );

      client.cache.updateQuery<{ task: { id: string; tags: Task["tags"] } }>(
        { query: GET_TASK_TAGS, variables: { task_id: event.task.id } },
        (existing) => {
          if (!existing?.task) {
            return existing;
          }

          return {
            task: {
              ...existing.task,
              tags: taskForCache.tags ?? [],
            },
          };
        }
      );

      if (shouldRefetch) {
        void refetchBoard();
      }
    },
    [client, projectId, refetchBoard]
  );

  useTaskRealtime(projectId, {
    onReordered: handleRealtimeReorder,
    onCreated: handleTaskCreated,
    onDeleted: handleTaskDeleted,
    onUpdated: handleTaskUpdated,
  });

  const createTask = async (stage_id: string, title: string) => {
    if (!projectId) return;
    await createTaskMutation({
      variables: { stage_id, title },
      refetchQueries: [{ query: GET_WORKFLOWS, variables: { project_id: projectId } }],
    });
  };

  const deleteTask = async (task_id: string) => {
    await deleteTaskMutation({
      variables: { id: task_id },
      refetchQueries: projectId
        ? [{ query: GET_WORKFLOWS, variables: { project_id: projectId } }]
        : [],
    });
  };

  const moveTask = async (task_id: string, to_stage_id: string) => {
    await moveTaskMutation({
      variables: { task_id, to_stage_id },
      refetchQueries: projectId
        ? [{ query: GET_WORKFLOWS, variables: { project_id: projectId } }]
        : [],
    });
  };

  const updateTask = async (input: Partial<Task> & { id: string }) => {
    await updateTaskMutation({
      variables: { ...input },
      refetchQueries: projectId
        ? [{ query: GET_WORKFLOWS, variables: { project_id: projectId } }]
        : [],
    });
  };

  const updatePriority = async (id: string, priority: Task["priority"]) => {
    if (!priority) return;
    await updatePriorityMutation({
      variables: { id, priority },
      refetchQueries: projectId
        ? [{ query: GET_WORKFLOWS, variables: { project_id: projectId } }]
        : [],
    });
  };

  const addStage = async (name: string) => {
    if (!workflow) return;
    await addStageMutation({
      variables: { workflow_id: workflow.id, name },
      refetchQueries: [{ query: GET_WORKFLOWS, variables: { project_id: projectId } }],
    });
  };

  const reorderStage = async (stage_id: string, task_ids: string[]) => {
    await reorderTasksMutation({
      variables: { stage_id, task_ids },
      refetchQueries: projectId
        ? [{ query: GET_WORKFLOWS, variables: { project_id: projectId } }]
        : [],
    });
  };

  const deleteStage = async (stage_id: string) => {
    await deleteStageMutation({
      variables: { id: stage_id },
      refetchQueries: projectId
        ? [{ query: GET_WORKFLOWS, variables: { project_id: projectId } }]
        : [],
    });
  };

  const refetchWrapper = useCallback(async () => {
    await refetchBoard();
  }, [refetchBoard]);

  return {
    projectId,
    workflow,
    stages,
    loading,
    error,
    createTask,
    deleteTask,
    moveTask,
    updateTask,
    updatePriority,
    addStage,
    reorderStage,
    deleteStage,
    refetch: refetchWrapper,
  };
}
