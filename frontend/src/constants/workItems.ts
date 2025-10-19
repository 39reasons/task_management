import type { WorkItemType } from "@shared/types";

export const WORK_ITEM_TYPE_LABELS: Record<WorkItemType, string> = {
  EPIC: "Epic",
  FEATURE: "Feature",
  STORY: "Story",
  TASK: "Task",
  BUG: "Bug",
};

export const WORK_ITEM_TYPE_SLUGS: Record<WorkItemType, string> = {
  EPIC: "epic",
  FEATURE: "feature",
  STORY: "story",
  TASK: "task",
  BUG: "bug",
};

export const WORK_ITEM_TEMPLATE_OPTIONS: Array<{
  type: WorkItemType;
  slug: string;
  label: string;
}> = [
  { type: "EPIC", slug: WORK_ITEM_TYPE_SLUGS.EPIC, label: "Epics" },
  { type: "FEATURE", slug: WORK_ITEM_TYPE_SLUGS.FEATURE, label: "Features" },
  { type: "STORY", slug: WORK_ITEM_TYPE_SLUGS.STORY, label: "User Story" },
  { type: "TASK", slug: WORK_ITEM_TYPE_SLUGS.TASK, label: "Task" },
  { type: "BUG", slug: WORK_ITEM_TYPE_SLUGS.BUG, label: "Bug" },
];

export function getWorkItemTypeLabel(type?: WorkItemType | null): string {
  if (!type) {
    return "Work Item";
  }
  return WORK_ITEM_TYPE_LABELS[type] ?? "Work Item";
}

export function getWorkItemTypeFromSlug(slug?: string | null): WorkItemType | null {
  if (!slug) {
    return null;
  }
  const normalized = slug.trim().toLowerCase();
  const matching = WORK_ITEM_TEMPLATE_OPTIONS.find((option) => option.slug === normalized);
  return matching?.type ?? null;
}
