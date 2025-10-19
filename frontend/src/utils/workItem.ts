import type { WorkItemType } from "@shared/types";

export function getPriorityLabel(priority?: string | null): string {
  if (!priority) return "None";
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function resolveWorkItemLink(projectId: string, itemId: string, type: WorkItemType): string {
  if (type === "TASK" || type === "BUG") {
    return `/projects/${projectId}/tasks/${itemId}`;
  }
  return `/projects/${projectId}/work-items/${itemId}`;
}
