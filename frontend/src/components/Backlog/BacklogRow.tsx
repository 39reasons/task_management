import { GripVertical, Check } from "lucide-react";
import type { CSSProperties } from "react";
import type { TaskStatus } from "@shared/types";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui";
import type { BacklogTaskRow } from "./types";
import { STATUS_OPTIONS, formatTimestamp, getStatusMeta } from "./backlogRowUtils";

export type BacklogRowProps = {
  row: BacklogTaskRow;
  index: number;
  isRowDisabled: boolean;
  isReorderEnabled: boolean;
  onSelect?: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  setNodeRef: (element: HTMLElement | null) => void;
  style?: CSSProperties;
  isDragging?: boolean;
  attributes?: DraggableAttributes;
  listeners?: SyntheticListenerMap;
};

export function BacklogRow({
  row,
  index,
  isRowDisabled,
  isReorderEnabled,
  onSelect,
  onStatusChange,
  setNodeRef,
  style,
  isDragging = false,
  attributes,
  listeners,
}: BacklogRowProps) {
  const statusMeta = getStatusMeta(row.status);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-t border-border/60 text-sm transition ${
        isDragging ? "bg-primary/10 shadow-sm" : "hover:bg-primary/5"
      }`}
      {...(attributes ?? {})}
      {...(listeners ?? {})}
    >
      <td className="px-5 py-3 align-top text-muted-foreground">
        <div className="flex items-center gap-2">
          <GripVertical
            className={`h-4 w-4 ${isReorderEnabled ? "text-muted-foreground" : "text-muted-foreground/50"}`}
            aria-hidden
          />
          <span className="text-sm font-semibold tabular-nums text-foreground">{index + 1}</span>
        </div>
      </td>
      <td className="px-5 py-3 align-top">
        <button
          type="button"
          className={`line-clamp-2 text-left font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-0 ${
            onSelect && !isRowDisabled ? "cursor-pointer" : "cursor-default"
          }`}
          onClick={() => {
            if (isRowDisabled) return;
            onSelect?.(row.id);
          }}
          disabled={isRowDisabled || !onSelect}
          onPointerDownCapture={(event) => {
            event.stopPropagation();
          }}
        >
          {row.title}
        </button>
      </td>
      <td className="px-5 py-3 align-top">
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={isRowDisabled}>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={`inline-flex items-center gap-1 rounded-full border-border/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide -ml-2 ${statusMeta.buttonClass}`}
              onClick={(event) => event.stopPropagation()}
              onPointerDownCapture={(event) => {
                event.stopPropagation();
              }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide">{statusMeta.label}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[8rem]">
            {STATUS_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onSelect={() => {
                  if (option.value === row.status || isRowDisabled) return;
                  onStatusChange(row.id, option.value);
                }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary data-[highlighted]:outline-none"
              >
                {option.value === row.status ? (
                  <Check className="h-4 w-4 shrink-0 text-blue-500" aria-hidden />
                ) : (
                  <span className="h-4 w-4 shrink-0" />
                )}
                <span>{option.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
      <td className="px-5 py-3 align-top text-muted-foreground">
        {row.estimate !== null && row.estimate !== undefined ? row.estimate : "—"}
      </td>
      <td className="px-5 py-3 align-top text-muted-foreground">{row.sprintName ?? "—"}</td>
      <td className="px-5 py-3 align-top text-muted-foreground">
        {formatTimestamp(row.updatedAt ?? row.createdAt)}
      </td>
    </tr>
  );
}
