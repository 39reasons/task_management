import type { Task } from "@shared/types";

export type TaskStatusOption = {
  value: Task["status"];
  label: string;
  dotClass: string;
};

export const TASK_STATUS_OPTIONS: TaskStatusOption[] = [
  { value: "new", label: "New", dotClass: "bg-muted-foreground/50" },
  { value: "active", label: "Active", dotClass: "bg-blue-500" },
  { value: "closed", label: "Closed", dotClass: "bg-emerald-500" },
];

export const DEFAULT_TASK_STATUS = TASK_STATUS_OPTIONS[0];
