import type { Stage, Task, AuthUser } from "@shared/types";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanOverlay } from "./KanbanOverlay";
import { useModal } from "../ModalStack";
import { AddStageColumn } from "./AddStageColumn";
import { collisionDetectionStrategy, cloneStages, areStagesEquivalent } from "./utils";
import { useKanbanDrag } from "./useKanbanDrag";

function SortableStageWrapper({
  stage,
  children,
}: {
  stage: Stage & { tasks: Task[] };
  children: (options: {
    dragHandleProps: Pick<
      ReturnType<typeof useSortable>,
      "attributes" | "listeners" | "setActivatorNodeRef"
    >;
    isDragging: boolean;
  }) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: stage.id,
    data: { type: "stage" },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-80" : undefined}
    >
      {children({
        dragHandleProps: { attributes, listeners, setActivatorNodeRef },
        isDragging,
      })}
    </div>
  );
}

interface KanbanBoardProps {
  stages: Array<Stage & { tasks: Task[] }>;
  onDelete?: (id: Task["id"]) => void;
  onMoveTask?: (taskId: Task["id"], stageId: Stage["id"]) => Promise<void> | void;
  onReorderTasks?: (stageId: Stage["id"], orderedIds: string[]) => Promise<void> | void;
  onAddTask?: (stage_id: Stage["id"], title: string) => void;
  onAddStage?: (name: string) => void;
  onDeleteStage?: (stage_id: Stage["id"]) => void;
  onReorderStages?: (stageIds: string[]) => Promise<void> | void;
  user: AuthUser | null;
  setSelectedTask: (task: Task) => void;
}

export function KanbanBoard({
  stages,
  onDelete,
  onMoveTask,
  onReorderTasks,
  onAddTask,
  onAddStage,
  onDeleteStage,
  onReorderStages,
  user,
  setSelectedTask,
}: KanbanBoardProps) {
  const { openModal } = useModal();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const previousStageCountRef = useRef(stages.length);
  const [displayStages, setDisplayStages] = useState(() => cloneStages(stages));
  const [columnHeight, setColumnHeight] = useState<number | null>(null);

  const { activeTask, onDragStart, onDragEnd, onDragCancel, onWheel } = useKanbanDrag({
    stages,
    displayStages,
    setDisplayStages,
    onMoveTask,
    onReorderTasks,
    onReorderStages,
    scrollContainerRef,
  });

  useEffect(() => {
    if (!areStagesEquivalent(stages, displayStages)) {
      setDisplayStages(cloneStages(stages));
    }
  }, [stages, displayStages]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const shouldScroll = displayStages.length > previousStageCountRef.current;
    previousStageCountRef.current = displayStages.length;

    if (!shouldScroll) {
      return;
    }

    requestAnimationFrame(() => {
      const node = scrollContainerRef.current;
      if (!node) return;
      const maxScroll = node.scrollWidth - node.clientWidth;
      if (maxScroll > 0) {
        node.scrollTo({
          left: maxScroll,
          behavior: "smooth",
        });
      }
    });
  }, [displayStages.length]);

  const updateColumnHeight = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const rect = container.getBoundingClientRect();
    const spacingBelow = 48; // leave breathing room for page padding
    const available = viewportHeight - rect.top - spacingBelow;
    if (!Number.isFinite(available)) {
      return;
    }
    const nextHeight = available > 0 ? Math.floor(available) : null;
    setColumnHeight((previous) => {
      if (previous === nextHeight) {
        return previous;
      }
      return nextHeight;
    });
  }, []);

  useLayoutEffect(() => {
    updateColumnHeight();
    const handleResize = () => updateColumnHeight();
    window.addEventListener("resize", handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
    }
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => updateColumnHeight());
      if (document.body) {
        observer.observe(document.body);
      }
      if (scrollContainerRef.current) {
        observer.observe(scrollContainerRef.current);
      }
    }
    return () => {
      window.removeEventListener("resize", handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
      }
      observer?.disconnect();
    };
  }, [updateColumnHeight]);

  useEffect(() => {
    const animation = requestAnimationFrame(updateColumnHeight);
    return () => cancelAnimationFrame(animation);
  }, [updateColumnHeight, displayStages.length]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div
        className="w-full max-w-full overflow-x-auto pb-6 styled-scrollbars overscroll-x-contain"
        ref={scrollContainerRef}
        onWheelCapture={onWheel}
      >
        <div className="flex w-max min-h-full select-none items-start gap-6">
          <SortableContext
            items={displayStages.map((stage) => stage.id)}
            strategy={horizontalListSortingStrategy}
          >
            {displayStages.map((stage) => (
              <SortableStageWrapper stage={stage} key={stage.id}>
                {({ dragHandleProps }) => (
                  <KanbanColumn
                    stage={stage}
                    onDelete={user ? onDelete : undefined}
                    onTaskClick={(task) => {
                      setSelectedTask(task);
                      openModal("task");
                    }}
                    onAddTask={user && onAddTask ? onAddTask : undefined}
                    onDeleteStage={user && onDeleteStage ? onDeleteStage : undefined}
                    dragHandleProps={dragHandleProps}
                    columnHeight={columnHeight}
                  />
                )}
              </SortableStageWrapper>
            ))}
          </SortableContext>

          {user && onAddStage ? (
            <AddStageColumn onAddStage={onAddStage} scrollContainerRef={scrollContainerRef} />
          ) : null}
        </div>
      </div>

      <DragOverlay>
        <KanbanOverlay task={activeTask} />
      </DragOverlay>
    </DndContext>
  );
}
