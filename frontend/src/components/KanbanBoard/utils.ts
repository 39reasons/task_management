import type { CollisionDetection } from "@dnd-kit/core";
import { closestCorners, pointerWithin, rectIntersection } from "@dnd-kit/core";
import type { Stage, Task } from "@shared/types";

export const STAGE_NAME_MAX_LENGTH = 512;

export const collisionDetectionStrategy: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  const rectangleCollisions = rectIntersection(args);
  if (rectangleCollisions.length > 0) {
    return rectangleCollisions;
  }

  return closestCorners(args);
};

export function cloneStages(stages: Array<Stage & { tasks: Task[] }>) {
  return stages.map((stage) => ({
    ...stage,
    tasks: stage.tasks.map((task) => ({ ...task })),
  }));
}

export function areStagesEquivalent(
  nextStages: Array<Stage & { tasks: Task[] }>,
  currentStages: Array<Stage & { tasks: Task[] }>
) {
  if (nextStages.length !== currentStages.length) {
    return false;
  }

  for (let index = 0; index < nextStages.length; index += 1) {
    if (nextStages[index]?.id !== currentStages[index]?.id) {
      return false;
    }
  }

  const byId = new Map(currentStages.map((stage) => [stage.id, stage]));
  for (const stage of nextStages) {
    const comparison = byId.get(stage.id);
    if (!comparison) {
      return false;
    }

    const stageTasks = [...stage.tasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const comparisonTasks = [...comparison.tasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    if (stageTasks.length !== comparisonTasks.length) {
      return false;
    }

    for (let index = 0; index < stageTasks.length; index += 1) {
      const task = stageTasks[index];
      const other = comparisonTasks[index];
      if (!other) {
        return false;
      }
      if (task.id !== other.id) {
        return false;
      }
      if ((task.position ?? index) !== (other.position ?? index)) {
        return false;
      }
      if (
        task.title !== other.title ||
        (task.description ?? "") !== (other.description ?? "") ||
        (task.due_date ?? "") !== (other.due_date ?? "") ||
        (task.priority ?? "") !== (other.priority ?? "")
      ) {
        return false;
      }
      const taskAssigneeId = task.assignee_id ?? task.assignee?.id ?? null;
      const otherAssigneeId = other.assignee_id ?? other.assignee?.id ?? null;
      if (taskAssigneeId !== otherAssigneeId) {
        return false;
      }
      const taskTagIds = (task.tags ?? []).map((tag) => tag.id).join(",");
      const otherTagIds = (other.tags ?? []).map((tag) => tag.id).join(",");
      if (taskTagIds !== otherTagIds) {
        return false;
      }
    }
  }

  return true;
}
