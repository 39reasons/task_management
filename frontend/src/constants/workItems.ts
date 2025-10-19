import type { WorkItemType } from "@shared/types";

export const WORK_ITEM_TYPE_LABELS: Record<WorkItemType, string> = {
  EPIC: "Epic",
  FEATURE: "Feature",
  STORY: "Story",
  TASK: "Task",
  BUG: "Bug",
};

export function getWorkItemTypeLabel(type?: WorkItemType | null): string {
  if (!type) {
    return "Work Item";
  }
  return WORK_ITEM_TYPE_LABELS[type] ?? "Work Item";
}
