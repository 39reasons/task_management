import type { Stage, Task, AuthUser } from "@shared/types";
import {
  DndContext,
  closestCorners,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { WheelEvent as ReactWheelEvent } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanOverlay } from "./KanbanOverlay";
import { useModal } from "../ModalStack";
import { Plus, CornerDownLeft } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const STAGE_NAME_MAX_LENGTH = 512;

const collisionDetectionStrategy: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  const rectangleCollisions = rectIntersection(args);
  if (rectangleCollisions.length > 0) {
    return rectangleCollisions;
  }

  return closestCorners(args);
};

function cloneStages(stages: Array<Stage & { tasks: Task[] }>) {
  return stages.map((stage) => ({
    ...stage,
    tasks: stage.tasks.map((task) => ({ ...task })),
  }));
}

function areStagesEquivalent(
  nextStages: Array<Stage & { tasks: Task[] }>,
  currentStages: Array<Stage & { tasks: Task[] }>
) {
  if (nextStages.length !== currentStages.length) {
    return false;
  }

  for (let index = 0; index < nextStages.length; index += 1) {
    if (nextStages[index]?.id !== currentStages[index]?.id) {
      return false;
    }
  }

  const byId = new Map(currentStages.map((stage) => [stage.id, stage]));
  for (const stage of nextStages) {
    const comparison = byId.get(stage.id);
    if (!comparison) {
      return false;
    }

    const stageTasks = [...stage.tasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const comparisonTasks = [...comparison.tasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    if (stageTasks.length !== comparisonTasks.length) {
      return false;
    }

    for (let index = 0; index < stageTasks.length; index += 1) {
      const task = stageTasks[index];
      const other = comparisonTasks[index];
      if (!other) {
        return false;
      }
      if (task.id !== other.id) {
        return false;
      }
      if ((task.position ?? index) !== (other.position ?? index)) {
        return false;
      }
      if (
        task.title !== other.title ||
        (task.description ?? "") !== (other.description ?? "") ||
        (task.due_date ?? "") !== (other.due_date ?? "") ||
        (task.priority ?? "") !== (other.priority ?? "")
      ) {
        return false;
      }
      const taskAssigneeId = task.assignee_id ?? task.assignee?.id ?? null;
      const otherAssigneeId = other.assignee_id ?? other.assignee?.id ?? null;
      if (taskAssigneeId !== otherAssigneeId) {
        return false;
      }
      const taskTagIds = (task.tags ?? []).map((tag) => tag.id).join(",");
      const otherTagIds = (other.tags ?? []).map((tag) => tag.id).join(",");
      if (taskTagIds !== otherTagIds) {
        return false;
      }
    }
  }

  return true;
}

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

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const addStageContainerRef = useRef<HTMLDivElement | null>(null);
  const addStageInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ isDragging: boolean; startX: number; scrollLeft: number } | null>(
    null
  );
  const previousStageCountRef = useRef(stages.length);
  const [displayStages, setDisplayStages] = useState(() => cloneStages(stages));
  const [columnHeight, setColumnHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!areStagesEquivalent(stages, displayStages)) {
      setDisplayStages(cloneStages(stages));
    }
  }, [stages, displayStages]);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeType = active.data.current?.type;
    setActiveTask(null);
    if (!over) return;

    // Stage reorder
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
      insertIndex = (tasksByStage.get(overId)?.length ?? 0);
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
      const destinationTasks = tasksByStage.get(destinationStageId) ?? [];
      const destinationWithout = destinationTasks.filter((t) => String(t.id) !== activeId);
      const movedTask = { ...task, stage_id: destinationStageId };
      const nextDestination = [...destinationWithout];
      nextDestination.splice(insertIndex, 0, movedTask);

      const sourceTasks = tasksByStage.get(sourceStageId) ?? [];
      const sourceWithout = sourceTasks.filter((t) => String(t.id) !== activeId);

      const destinationWithPositions = applyPositions(nextDestination, destinationStageId);
      const sourceWithPositions = applyPositions(sourceWithout, sourceStageId);

      setDisplayStages((prev) =>
        prev.map((stage) => {
          if (stage.id === destinationStageId) {
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
              await onMoveTask(task.id, destinationStageId);
            }
            if (onReorderTasks) {
              await onReorderTasks(destinationStageId, destinationWithPositions.map((t) => String(t.id)));
              await onReorderTasks(sourceStageId, sourceWithPositions.map((t) => String(t.id)));
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
            await onReorderTasks(sourceStageId, reorderedWithPositions.map((t) => String(t.id)));
          } catch (error) {
            console.error("Failed to persist task reorder", error);
            setDisplayStages((prev) =>
              areStagesEquivalent(stages, prev) ? prev : cloneStages(stages)
            );
          }
        })();
      }
    }
  };

  useEffect(() => {
    if (!isAddingStage) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!addStageContainerRef.current?.contains(event.target as Node)) {
        setIsAddingStage(false);
        setNewStageName("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAddingStage]);

  useEffect(() => {
    if (isAddingStage) {
      addStageInputRef.current?.focus();
    }
  }, [isAddingStage]);

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
  }, [displayStages.length]);

  const handleHorizontalScroll = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
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
  }, [updateColumnHeight, displayStages.length, isAddingStage]);

  const submitNewStage = async () => {
    if (!onAddStage) return;
    const value = newStageName.trim();
    if (!value) return;
    if (value.length > STAGE_NAME_MAX_LENGTH) return;
    await Promise.resolve(onAddStage(value));
    setNewStageName("");
    setIsAddingStage(false);
    if (scrollContainerRef.current) {
      requestAnimationFrame(() => {
        const containerNode = scrollContainerRef.current;
        if (!containerNode) return;
        const maxScroll = containerNode.scrollWidth - containerNode.clientWidth;
        if (maxScroll > 0) {
          containerNode.scrollTo({ left: maxScroll, behavior: "smooth" });
        }
      });
    }
  };

  const handleAddStageSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await submitNewStage();
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={(event) => {
        const activeType = event.active.data.current?.type;
        if (activeType === "stage") {
          setActiveTask(null);
          return;
        }
        const task = allTasks.find((t) => String(t.id) === String(event.active.id));
        setActiveTask(task || null);
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveTask(null);
      }}
    >
      <div
        className="w-full max-w-full overflow-x-auto pb-6 styled-scrollbars overscroll-x-contain"
        ref={scrollContainerRef}
        onWheelCapture={handleHorizontalScroll}
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
          <div className="flex min-w-[280px] flex-col gap-3">
            {!isAddingStage ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddingStage(true)}
                className="flex w-full items-center justify-start gap-3 rounded-2xl border border-dashed border-border/60 bg-transparent px-5 py-8 text-left transition hover:border-primary/40 hover:bg-muted/20"
              >
                <span className="flex h-5 w-5 items-center justify-center text-primary">
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <span className="flex flex-col text-left">
                  <span className="text-sm font-semibold text-foreground">Add stage</span>
                  <span className="text-xs text-muted-foreground">
                    Create a new column for this workflow
                  </span>
                </span>
              </Button>
            ) : (
              <div ref={addStageContainerRef} className="w-full">
                <form
                  onPointerDown={(e) => e.stopPropagation()}
                  onSubmit={handleAddStageSubmit}
                  className="flex items-center gap-2 rounded-lg border border-primary/40 bg-muted/30 px-3 py-2 shadow-sm focus-within:border-primary"
                >
                  <Input
                    ref={addStageInputRef}
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value.slice(0, STAGE_NAME_MAX_LENGTH))}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setIsAddingStage(false);
                        setNewStageName("");
                      }
                    }}
                    placeholder="Add stage title..."
                    className="border-0 bg-transparent text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    maxLength={STAGE_NAME_MAX_LENGTH}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (newStageName.trim()) {
                        void submitNewStage();
                      }
                    }}
                    disabled={!newStageName.trim()}
                    className={`h-8 w-8 rounded-full text-muted-foreground ${
                      newStageName.trim() ? "text-primary hover:bg-primary/10" : ""
                    }`}
                    aria-label="Add stage"
                  >
                    <CornerDownLeft className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            )}
          </div>
        ) : null}
        </div>
      </div>

      <DragOverlay>
        <KanbanOverlay task={activeTask} />
      </DragOverlay>
    </DndContext>
  );
}
