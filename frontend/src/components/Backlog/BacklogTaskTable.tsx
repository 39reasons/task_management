import type { TaskStatus } from "@shared/types";
import { Loader2, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui";

export interface BacklogTaskRow {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

type BacklogTaskTableProps = {
  rows: BacklogTaskRow[];
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
};

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string; badgeClass: string }> = [
  { value: "new", label: "New", badgeClass: "bg-muted/40 text-muted-foreground" },
  { value: "active", label: "Active", badgeClass: "bg-blue-500/15 text-blue-600" },
  { value: "closed", label: "Closed", badgeClass: "bg-emerald-500/15 text-emerald-600" },
];

function getStatusMeta(status: TaskStatus) {
  return STATUS_OPTIONS.find((option) => option.value === status) ?? STATUS_OPTIONS[0];
}

function formatTimestamp(value?: string | null): string {
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

export function BacklogTaskTable({ rows, onStatusChange, onDelete, disabled = false }: BacklogTaskTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/60 px-4 py-6 text-sm text-muted-foreground">
        No tasks captured in this backlog yet. Add items here to triage before moving them into a workflow.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/80">
      <div className="min-w-full overflow-x-auto">
        <table className="min-w-full table-fixed border-collapse text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3 text-left font-semibold">Task</th>
              <th className="w-32 px-5 py-3 text-left font-semibold">Status</th>
              <th className="w-32 px-5 py-3 text-left font-semibold">Last Updated</th>
              <th className="w-20 px-5 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const statusMeta = getStatusMeta(row.status);
              const isRowDisabled = disabled || row.isUpdating || row.isDeleting;
              return (
                <tr key={row.id} className="border-t border-border/60 text-sm transition hover:bg-primary/5">
                  <td className="px-5 py-3 align-top">
                    <p className="font-medium text-foreground">{row.title}</p>
                    {row.description ? (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{row.description}</p>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 align-top">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild disabled={isRowDisabled}>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="inline-flex items-center gap-2 rounded-full border-border/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                        >
                          <Badge
                            variant="outline"
                            className={`border-transparent px-2 py-0 text-[11px] font-semibold uppercase tracking-wide ${statusMeta.badgeClass}`}
                          >
                            {statusMeta.label}
                          </Badge>
                          {row.isUpdating ? (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          ) : null}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
                        {STATUS_OPTIONS.map((option) => (
                          <DropdownMenuItem
                            key={option.value}
                            onSelect={(event) => {
                              event.preventDefault();
                              if (option.value === row.status || isRowDisabled) return;
                              onStatusChange(row.id, option.value);
                            }}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="text-sm">{option.label}</span>
                            {option.value === row.status ? (
                              <Badge
                                variant="outline"
                                className={`border-transparent px-2 py-0 text-[10px] uppercase tracking-wide ${option.badgeClass}`}
                              >
                                Selected
                              </Badge>
                            ) : null}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                  <td className="px-5 py-3 align-top text-muted-foreground">{formatTimestamp(row.updatedAt ?? row.createdAt)}</td>
                  <td className="px-5 py-3 align-top">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(row.id)}
                      disabled={isRowDisabled}
                    >
                      {row.isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
