import type { TaskStatus } from "@shared/types";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent, DragCancelEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui";

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

type BacklogTaskTableProps = {
  rows: BacklogTaskRow[];
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
  onSelect?: (id: string) => void;
  onReorder?: (orderedIds: string[]) => Promise<void> | void;
  isReordering?: boolean;
};

const STATUS_OPTIONS: Array<{
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

export function BacklogTaskTable({
  rows,
  onStatusChange,
  onDelete: _onDelete,
  disabled = false,
  onSelect,
  onReorder,
  isReordering = false,
}: BacklogTaskTableProps) {
  const [orderedRows, setOrderedRows] = useState(rows);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const pendingOrderRef = useRef<string[] | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));
  const isReorderEnabled = Boolean(onReorder) && !disabled && !isReordering;

  useEffect(() => {
    if (pendingOrderRef.current) {
      const nextById = new Map(rows.map((row) => [row.id, row]));
      const pendingIds = pendingOrderRef.current;
      setOrderedRows((current) => {
        const currentById = new Map(current.map((row) => [row.id, row]));
        const pendingSet = new Set(pendingIds);
        const updated: BacklogTaskRow[] = [];
        for (const id of pendingIds) {
          const nextRow = nextById.get(id) ?? currentById.get(id);
          if (nextRow) {
            updated.push(nextRow);
            nextById.delete(id);
          }
        }
        if (nextById.size > 0) {
          for (const row of nextById.values()) {
            updated.push(row);
          }
        } else {
          for (const row of current) {
            if (!pendingSet.has(row.id)) {
              updated.push(row);
            }
          }
        }
        return updated;
      });
      pendingOrderRef.current = null;
      return;
    }

    if (isReordering) {
      return;
    }

    setOrderedRows(rows);
  }, [rows, isReordering]);

  const itemIds = useMemo(() => orderedRows.map((row) => row.id), [orderedRows]);
  const [delayedSpinner, setDelayedSpinner] = useState(false);
  useEffect(() => {
    if (!isReordering) {
      setDelayedSpinner(false);
      return;
    }
    const timer = setTimeout(() => setDelayedSpinner(true), 200);
    return () => {
      clearTimeout(timer);
    };
  }, [isReordering]);
  const showOrderSpinner = delayedSpinner;
  const activeRow = useMemo(() => {
    if (!activeTaskId) return null;
    return orderedRows.find((row) => row.id === activeTaskId) ?? rows.find((row) => row.id === activeTaskId) ?? null;
  }, [activeTaskId, orderedRows, rows]);
  const activeRowIndex = useMemo(() => {
    if (!activeRow) return -1;
    return orderedRows.findIndex((row) => row.id === activeRow.id);
  }, [activeRow, orderedRows]);
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (!isReorderEnabled) return;
      setActiveTaskId(String(event.active.id));
    },
    [isReorderEnabled]
  );
  const handleDragCancel = useCallback(
    (_event: DragCancelEvent) => {
      if (!isReorderEnabled) return;
      setActiveTaskId(null);
      pendingOrderRef.current = null;
      setOrderedRows(rows);
    },
    [isReorderEnabled, rows]
  );
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!isReorderEnabled || !onReorder) {
        setActiveTaskId(null);
        return;
      }

      const { active, over } = event;
      if (!over || active.id === over.id) {
        pendingOrderRef.current = null;
        setActiveTaskId(null);
        return;
      }

      const previous = orderedRows;
      const oldIndex = previous.findIndex((row) => row.id === active.id);
      const newIndex = previous.findIndex((row) => row.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        pendingOrderRef.current = null;
        setActiveTaskId(null);
        return;
      }

      const next = arrayMove(previous, oldIndex, newIndex);
      const nextIds = next.map((row) => row.id);

      pendingOrderRef.current = nextIds;
      setOrderedRows(next);

      try {
        await onReorder(nextIds);
      } catch {
        setOrderedRows(previous);
        pendingOrderRef.current = null;
      } finally {
        setActiveTaskId(null);
      }
    },
    [isReorderEnabled, onReorder, orderedRows]
  );

  if (orderedRows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/60 px-4 py-6 text-sm text-muted-foreground">
        No tasks captured in this backlog yet. Add items here to triage before moving them into a workflow.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/80">
      <div className="min-w-full overflow-x-auto">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
          <table className="min-w-full table-fixed border-collapse text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-24 px-5 py-3 text-left font-semibold">
                  <span className="flex items-center gap-2">
                    Order
                    {showOrderSpinner ? (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    ) : null}
                  </span>
                </th>
                <th className="px-5 py-3 text-left font-semibold">Task</th>
                <th className="w-32 px-5 py-3 text-left font-semibold">Status</th>
                <th className="w-24 px-5 py-3 text-left font-semibold">Estimate</th>
                <th className="w-36 px-5 py-3 text-left font-semibold">Sprint</th>
                <th className="w-32 px-5 py-3 text-left font-semibold">Last Updated</th>
              </tr>
            </thead>
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              <tbody>
                {orderedRows.map((row, index) => {
                  const isRowDisabled = Boolean(disabled || row.isUpdating || row.isDeleting);
                  return (
                    <SortableBacklogRow
                      key={row.id}
                      row={row}
                      index={index}
                      isRowDisabled={isRowDisabled}
                      isReorderEnabled={isReorderEnabled}
                      onSelect={onSelect}
                      onStatusChange={onStatusChange}
                    />
                  );
                })}
              </tbody>
            </SortableContext>
          </table>
          <DragOverlay>
            {activeRow ? (
              <BacklogRowOverlay
                row={activeRow}
                index={activeRowIndex >= 0 ? activeRowIndex : 0}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

type SortableBacklogRowProps = {
  row: BacklogTaskRow;
  index: number;
  isRowDisabled: boolean;
  isReorderEnabled: boolean;
  onSelect?: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
};

function SortableBacklogRow({
  row,
  index,
  isRowDisabled,
  isReorderEnabled,
  onSelect,
  onStatusChange,
}: SortableBacklogRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.id,
    disabled: !isReorderEnabled || isRowDisabled,
  });

  const visibility: CSSProperties["visibility"] = isDragging ? "hidden" : "visible";

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
    visibility,
    pointerEvents: isDragging ? "none" : undefined,
  };

  const statusMeta = getStatusMeta(row.status);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-t border-border/60 text-sm transition ${
        isDragging ? "bg-primary/10 shadow-sm" : "hover:bg-primary/5"
      }`}
      {...attributes}
      {...listeners}
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

function BacklogRowOverlay({ row, index }: { row: BacklogTaskRow; index: number }) {
  const statusMeta = getStatusMeta(row.status);
  const displayOrder = index >= 0 ? index + 1 : (row.order ?? 1);
  const overlayStatusClass = statusMeta.buttonClass;

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
          className={`inline-flex h-6 items-center rounded-full border border-border/70 px-3 text-xs font-semibold uppercase tracking-wide ${overlayStatusClass}`}
        >
          {statusMeta.label}
        </span>
      </div>
      <div className="text-muted-foreground">
        {row.estimate !== null && row.estimate !== undefined ? row.estimate : "—"}
      </div>
      <div className="text-muted-foreground">{row.sprintName ?? "—"}</div>
      <div className="text-muted-foreground">
        {formatTimestamp(row.updatedAt ?? row.createdAt)}
      </div>
    </div>
  );
}
