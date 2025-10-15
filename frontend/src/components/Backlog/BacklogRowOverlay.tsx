import { GripVertical } from "lucide-react";

import { formatTimestamp, getStatusMeta } from "./backlogRowUtils";
import type { BacklogTaskRow } from "./types";

type BacklogRowOverlayProps = {
  row: BacklogTaskRow;
  index: number;
};

export function BacklogRowOverlay({ row, index }: BacklogRowOverlayProps) {
  const statusMeta = getStatusMeta(row.status);
  const displayOrder = index >= 0 ? index + 1 : row.order ?? 1;

  return (
    <div
      className="grid gap-4 rounded-2xl border border-border bg-card px-5 py-3 text-sm shadow-lg"
      style={{ gridTemplateColumns: "6rem minmax(0,1fr) 8rem 6rem 9rem 8rem" }}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="text-sm font-semibold tabular-nums text-foreground">{displayOrder}</span>
      </div>
      <div className="font-medium text-foreground">{row.title}</div>
      <div>
        <span
          className={`inline-flex h-6 items-center rounded-full border border-border/70 px-3 text-xs font-semibold uppercase tracking-wide ${statusMeta.buttonClass}`}
        >
          {statusMeta.label}
        </span>
      </div>
      <div className="text-muted-foreground">
        {row.estimate !== null && row.estimate !== undefined ? row.estimate : "—"}
      </div>
      <div className="text-muted-foreground">{row.sprintName ?? "—"}</div>
      <div className="text-muted-foreground">{formatTimestamp(row.updatedAt ?? row.createdAt)}</div>
    </div>
  );
}
