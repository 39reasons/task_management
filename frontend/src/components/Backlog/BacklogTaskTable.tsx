import type { TaskStatus } from "@shared/types";
import { DndContext, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties } from "react";
import { Loader2 } from "lucide-react";

import { BacklogRow } from "./BacklogRow";
import { BacklogRowOverlay } from "./BacklogRowOverlay";
import type { BacklogTaskRow } from "./types";
export type { BacklogTaskRow } from "./types";
import { useBacklogReorder } from "./useBacklogReorder";

export type BacklogTaskTableProps = {
  rows: BacklogTaskRow[];
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
  onSelect?: (id: string) => void;
  onReorder?: (orderedIds: string[]) => Promise<void> | void;
  isReordering?: boolean;
};

export function BacklogTaskTable({
  rows,
  onStatusChange,
  onDelete: _onDelete,
  disabled = false,
  onSelect,
  onReorder,
  isReordering = false,
}: BacklogTaskTableProps) {
  const sensors = useSensors(useSensor(PointerSensor));
  void _onDelete;
  const {
    orderedRows,
    itemIds,
    activeRow,
    activeRowIndex,
    showOrderSpinner,
    isReorderEnabled,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  } = useBacklogReorder({ rows, disabled, onReorder, isReordering });

  if (orderedRows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/60 px-4 py-6 text-sm text-muted-foreground">
        No tasks captured in this backlog yet. Add items here to triage before moving them onto a board.
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
              <BacklogRowOverlay row={activeRow} index={activeRowIndex >= 0 ? activeRowIndex : 0} />
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
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

  return (
    <BacklogRow
      row={row}
      index={index}
      isRowDisabled={isRowDisabled}
      isReorderEnabled={isReorderEnabled}
      onSelect={onSelect}
      onStatusChange={onStatusChange}
      setNodeRef={setNodeRef}
      style={style}
      isDragging={isDragging}
      attributes={attributes}
      listeners={listeners}
    />
  );
}
