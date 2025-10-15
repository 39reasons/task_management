import type { TaskStatus } from "@shared/types";

export const STATUS_OPTIONS: Array<{
  value: TaskStatus;
  label: string;
  buttonClass: string;
}> = [
  {
    value: "new",
    label: "New",
    buttonClass:
      "border-transparent !bg-[#3a3a3a] text-white hover:!bg-[#4a4a4a] hover:text-white focus-visible:ring-[#5a5a5a]",
  },
  {
    value: "active",
    label: "Active",
    buttonClass: "border-transparent bg-blue-500/15 text-blue-600 hover:bg-blue-500/25",
  },
  {
    value: "closed",
    label: "Closed",
    buttonClass: "border-transparent bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30",
  },
];

export function getStatusMeta(status: TaskStatus) {
  return STATUS_OPTIONS.find((option) => option.value === status) ?? STATUS_OPTIONS[0];
}

export function formatTimestamp(value?: string | null): string {
  if (!value) return "—";
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return "—";
  }
}
