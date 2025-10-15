import type { TaskStatus } from "@shared/types";

export interface BacklogTaskRow {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
  estimate?: number | null;
  sprintName?: string | null;
  order?: number | null;
  isUpdating?: boolean;
  isDeleting?: boolean;
}
