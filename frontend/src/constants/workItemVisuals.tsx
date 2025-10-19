import {
  BookOpen,
  Bug,
  ListChecks,
  Mountain,
  Puzzle,
  type LucideIcon,
} from "lucide-react";
import type { WorkItemType } from "@shared/types";

type WorkItemIconMeta = {
  icon: LucideIcon;
  colorClass: string;
};

const DEFAULT_WORK_ITEM_ICON_META: WorkItemIconMeta = {
  icon: ListChecks,
  colorClass: "text-muted-foreground",
};

export const WORK_ITEM_TYPE_ICON_META: Record<WorkItemType, WorkItemIconMeta> = {
  EPIC: { icon: Mountain, colorClass: "text-purple-500" },
  FEATURE: { icon: Puzzle, colorClass: "text-amber-500" },
  STORY: { icon: BookOpen, colorClass: "text-sky-500" },
  TASK: { icon: ListChecks, colorClass: "text-emerald-500" },
  BUG: { icon: Bug, colorClass: "text-red-500" },
};

export function getWorkItemIconMeta(type?: WorkItemType | null): WorkItemIconMeta {
  if (!type) {
    return DEFAULT_WORK_ITEM_ICON_META;
  }
  return WORK_ITEM_TYPE_ICON_META[type] ?? DEFAULT_WORK_ITEM_ICON_META;
}
