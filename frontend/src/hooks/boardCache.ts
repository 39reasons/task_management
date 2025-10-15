import type { ApolloCache } from "@apollo/client";

import { GET_WORKFLOWS } from "../graphql";

import type { Stage, Task, Workflow } from "@shared/types";

interface WriteTaskToCacheOptions {
  cache: ApolloCache<unknown>;
  projectId: string;
  task: Task;
  optimisticId?: string;
}

export function normalizeTaskForCache(task: Task): Task {
  const normalizedTask = {
    ...task,
    status: task.status ?? "new",
    estimate: task.estimate ?? null,
    backlog_id: task.backlog_id ?? null,
    sprint_id: task.sprint_id ?? null,
    sprint: task.sprint ?? null,
    project_id: task.project_id ?? "",
    team_id: task.team_id ?? null,
    stage_id: task.stage_id ?? null,
    position: task.position ?? 0,
    created_at: task.created_at ?? null,
    updated_at: task.updated_at ?? null,
    __typename: "Task" as const,
    tags: (task.tags ?? []).map((tag) => ({
      ...tag,
      __typename: "Tag" as const,
    })) as unknown as Task["tags"],
    assignee_id: task.assignee_id ?? null,
    assignee: task.assignee
      ? ({
          ...task.assignee,
          __typename: "User" as const,
      } as unknown as Task["assignee"])
      : null,
  } as Task & { __typename: "Task" };

  return normalizedTask;
}

export function normalizeStageForCache(stage: Stage): Stage {
  return {
    ...stage,
    tasks: stage.tasks
      .map((task) => normalizeTaskForCache(task))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
  };
}

export function normalizeWorkflow(workflow: Workflow): Workflow {
  return {
    ...workflow,
    stages: workflow.stages
      .map((stage) => normalizeStageForCache(stage))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
  };
}

export function createOptimisticTask({
  stage,
  stageId,
  projectId,
  title,
  teamId,
}: {
  stage?: Stage;
  stageId: string;
  projectId: string;
  title: string;
  teamId?: string | null;
}): { task: Task; optimisticId: string } {
  const optimisticId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `temp-${Date.now()}`;

  const optimisticTask = normalizeTaskForCache({
    id: optimisticId,
    title,
    description: null,
    due_date: null,
    priority: null,
    status: "new",
    stage_id: stageId,
    backlog_id: null,
    sprint_id: null,
    sprint: null,
    estimate: null,
    project_id: projectId,
    position: stage?.tasks.length ?? 0,
    team_id: teamId ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    assignee_id: null,
    assignee: null,
    tags: [],
  } as unknown as Task);

  return { task: optimisticTask, optimisticId };
}

export function writeTaskToCache({
  cache,
  projectId,
  task,
  optimisticId,
}: WriteTaskToCacheOptions) {
  cache.updateQuery<{ workflows: Workflow[] }>(
    { query: GET_WORKFLOWS, variables: { project_id: projectId } },
    (existing) => {
      if (!existing) {
        return existing;
      }

      const workflows = existing.workflows.map((workflow) => {
        if (workflow.project_id !== projectId) {
          return workflow;
        }

        const nextStages = workflow.stages.map((stage) => {
          if (stage.id !== task.stage_id) {
            return stage;
          }

          const withoutDuplicate = stage.tasks.filter(
            (existingTask) =>
              existingTask.id !== task.id &&
              (!optimisticId || existingTask.id !== optimisticId)
          );
          const nextTasks = [...withoutDuplicate, task]
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((sortedTask, index) => ({
              ...sortedTask,
              position: index,
            }));

          return {
            ...stage,
            tasks: nextTasks,
          };
        });

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
}

export function selectStages(workflow: Workflow | null): Stage[] {
  return workflow?.stages ?? [];
}
