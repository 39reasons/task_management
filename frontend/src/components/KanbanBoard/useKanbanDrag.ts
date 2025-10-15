import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import type { Stage, Task } from "@shared/types";
import type { WheelEvent as ReactWheelEvent } from "react";
import { areStagesEquivalent, cloneStages } from "./utils";

interface UseKanbanDragOptions {
  stages: Array<Stage & { tasks: Task[] }>;
  displayStages: Array<Stage & { tasks: Task[] }>;
  setDisplayStages: React.Dispatch<
    React.SetStateAction<Array<Stage & { tasks: Task[] }>>
  >;
  onMoveTask?: (taskId: Task["id"], stageId: Stage["id"]) => Promise<void> | void;
  onReorderTasks?: (stageId: Stage["id"], orderedIds: string[]) => Promise<void> | void;
  onReorderStages?: (stageIds: string[]) => Promise<void> | void;
  scrollContainerRef: React.MutableRefObject<HTMLDivElement | null>;
}

interface UseKanbanDragResult {
  activeTask: Task | null;
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel: () => void;
  onWheel: (event: ReactWheelEvent<HTMLDivElement>) => void;
}

export function useKanbanDrag({
  stages,
  displayStages,
  setDisplayStages,
  onMoveTask,
  onReorderTasks,
  onReorderStages,
  scrollContainerRef,
}: UseKanbanDragOptions): UseKanbanDragResult {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const dragStateRef = useRef<{
    isDragging: boolean;
    startX: number;
    scrollLeft: number;
  } | null>(null);

  const allTasks = useMemo(() => displayStages.flatMap((stage) => stage.tasks ?? []), [displayStages]);
  const stageMap = useMemo(() => {
    const map = new Map<string, Stage>();
    for (const stage of displayStages) {
      map.set(stage.id, stage);
    }
    return map;
  }, [displayStages]);
  const tasksByStage = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const stage of displayStages) {
      map.set(stage.id, [...(stage.tasks ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
    }
    return map;
  }, [displayStages]);
  const taskMap = useMemo(() => {
    const map = new Map<string, Task>();
    for (const task of allTasks) {
      map.set(String(task.id), task);
    }
    return map;
  }, [allTasks]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      container.classList.add("dragging");
      dragStateRef.current = {
        isDragging: true,
        startX: event.clientX,
        scrollLeft: container.scrollLeft,
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragStateRef.current?.isDragging) return;
      const deltaX = event.clientX - dragStateRef.current.startX;
      container.scrollLeft = dragStateRef.current.scrollLeft - deltaX;
    };

    const handlePointerUp = () => {
      if (dragStateRef.current?.isDragging) {
        container.classList.remove("dragging");
      }
      dragStateRef.current = null;
    };

    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerup", handlePointerUp);
    container.addEventListener("pointerleave", handlePointerUp);

    return () => {
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerup", handlePointerUp);
      container.removeEventListener("pointerleave", handlePointerUp);
    };
  }, [displayStages.length, scrollContainerRef]);

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      const activeType = event.active.data.current?.type;
      if (activeType === "stage") {
        setActiveTask(null);
        return;
      }
      const task = allTasks.find((t) => String(t.id) === String(event.active.id));
      setActiveTask(task || null);
    },
    [allTasks]
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const activeType = active.data.current?.type;
      setActiveTask(null);
      if (!over) return;

      if (activeType === "stage") {
        const overType = over.data.current?.type;
        if (overType !== "stage" && overType !== undefined) {
          return;
        }

        const activeIndex = displayStages.findIndex((stage) => stage.id === String(active.id));
        const overIndex = displayStages.findIndex((stage) => stage.id === String(over.id));
        if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
          return;
        }

        const reordered = [...displayStages];
        const [moved] = reordered.splice(activeIndex, 1);
        reordered.splice(overIndex, 0, moved);
        setDisplayStages(reordered);
        onReorderStages?.(reordered.map((stage) => stage.id));
        return;
      }

      const activeId = String(active.id);
      const overId = String(over.id);

      const task = allTasks.find((t) => String(t.id) === activeId);
      if (!task) return;

      let destinationStageId: string | null = null;
      let insertIndex: number | null = null;

      if (stageMap.has(overId)) {
        destinationStageId = overId;
        insertIndex = tasksByStage.get(overId)?.length ?? 0;
      } else if (taskMap.has(overId)) {
        const targetTask = taskMap.get(overId)!;
        if (!targetTask.stage_id) {
          return;
        }
        destinationStageId = targetTask.stage_id;
        const stageTasks = tasksByStage.get(destinationStageId) ?? [];
        insertIndex = stageTasks.findIndex((t) => String(t.id) === overId);
      }

      if (!destinationStageId || insertIndex === null) return;

      const sourceStageId = task.stage_id;
      if (!sourceStageId) return;

      const applyPositions = (tasks: Task[], stageId: string) =>
        tasks.map((t, index) => ({ ...t, stage_id: stageId, position: index }));

      if (destinationStageId !== sourceStageId) {
        const destinationId = destinationStageId;
        const destinationTasks = tasksByStage.get(destinationId) ?? [];
        const destinationWithout = destinationTasks.filter((t) => String(t.id) !== activeId);
        const movedTask = { ...task, stage_id: destinationId };
        const nextDestination = [...destinationWithout];
        nextDestination.splice(insertIndex, 0, movedTask);

        const sourceTasks = tasksByStage.get(sourceStageId) ?? [];
        const sourceWithout = sourceTasks.filter((t) => String(t.id) !== activeId);

        const destinationWithPositions = applyPositions(nextDestination, destinationId);
        const sourceWithPositions = applyPositions(sourceWithout, sourceStageId);

        setDisplayStages((prev) =>
          prev.map((stage) => {
            if (stage.id === destinationId) {
              return {
                ...stage,
                tasks: destinationWithPositions,
              };
            }
            if (stage.id === sourceStageId) {
              return {
                ...stage,
                tasks: sourceWithPositions,
              };
            }
            return stage;
          })
        );

        if (onMoveTask || onReorderTasks) {
          void (async () => {
            try {
              if (onMoveTask) {
                await onMoveTask(task.id, destinationId);
              }
              if (onReorderTasks) {
                await onReorderTasks(
                  destinationId,
                  destinationWithPositions.map((t) => String(t.id))
                );
                await onReorderTasks(
                  sourceStageId,
                  sourceWithPositions.map((t) => String(t.id))
                );
              }
            } catch (error) {
              console.error("Failed to persist task move", error);
              setDisplayStages((prev) =>
                areStagesEquivalent(stages, prev) ? prev : cloneStages(stages)
              );
            }
          })();
        }
      } else {
        const stageTasks = tasksByStage.get(sourceStageId) ?? [];
        const filtered = stageTasks.filter((t) => String(t.id) !== activeId);
        filtered.splice(insertIndex, 0, task);
        const reorderedWithPositions = applyPositions(filtered, sourceStageId);

        setDisplayStages((prev) =>
          prev.map((stage) =>
            stage.id === sourceStageId
              ? {
                  ...stage,
                  tasks: reorderedWithPositions,
                }
              : stage
          )
        );

        if (onReorderTasks) {
          void (async () => {
            try {
              await onReorderTasks(
                sourceStageId,
                reorderedWithPositions.map((t) => String(t.id))
              );
            } catch (error) {
              console.error("Failed to persist task reorder", error);
              setDisplayStages((prev) =>
                areStagesEquivalent(stages, prev) ? prev : cloneStages(stages)
              );
            }
          })();
        }
      }
    },
    [
      allTasks,
      displayStages,
      onMoveTask,
      onReorderStages,
      onReorderTasks,
      setDisplayStages,
      stageMap,
      stages,
      taskMap,
      tasksByStage,
    ]
  );

  const onDragCancel = useCallback(() => {
    setActiveTask(null);
  }, []);

  const onWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey) return;

    const { deltaX, deltaY } = event;
    const horizontalIntent = Math.abs(deltaX) > Math.abs(deltaY);

    const allowVerticalScroll = () => {
      let node = event.target as HTMLElement | null;
      while (node && node !== event.currentTarget) {
        const style = window.getComputedStyle(node);
        const canScrollVertically =
          node.scrollHeight > node.clientHeight &&
          (style.overflowY === "auto" || style.overflowY === "scroll");
        if (canScrollVertically) {
          return true;
        }
        node = node.parentElement;
      }
      return false;
    };

    if (horizontalIntent) {
      if (deltaX === 0) return;
      event.currentTarget.scrollLeft += deltaX;
      event.preventDefault();
      return;
    }

    if (deltaY === 0) {
      return;
    }

    if (allowVerticalScroll()) {
      return;
    }

    event.currentTarget.scrollLeft += deltaY;
    event.preventDefault();
  }, []);

  return {
    activeTask,
    onDragStart,
    onDragEnd,
    onDragCancel,
    onWheel,
  };
}
