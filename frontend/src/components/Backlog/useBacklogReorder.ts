import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEndEvent, DragStartEvent, DragCancelEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

import type { BacklogTaskRow } from "./types";

type UseBacklogReorderOptions = {
  rows: BacklogTaskRow[];
  disabled?: boolean;
  onReorder?: (orderedIds: string[]) => Promise<void> | void;
  isReordering?: boolean;
};

type UseBacklogReorderResult = {
  orderedRows: BacklogTaskRow[];
  itemIds: string[];
  activeRow: BacklogTaskRow | null;
  activeRowIndex: number;
  showOrderSpinner: boolean;
  isReorderEnabled: boolean;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => Promise<void> | void;
  handleDragCancel: (event: DragCancelEvent) => void;
};

export function useBacklogReorder({
  rows,
  disabled = false,
  onReorder,
  isReordering = false,
}: UseBacklogReorderOptions): UseBacklogReorderResult {
  const [orderedRows, setOrderedRows] = useState(rows);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const pendingOrderRef = useRef<string[] | null>(null);
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

  const handleDragCancel = useCallback(() => {
    if (!isReorderEnabled) return;
    setActiveTaskId(null);
    pendingOrderRef.current = null;
    setOrderedRows(rows);
  }, [isReorderEnabled, rows]);

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

  return {
    orderedRows,
    itemIds,
    activeRow,
    activeRowIndex,
    showOrderSpinner: delayedSpinner,
    isReorderEnabled,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  };
}
