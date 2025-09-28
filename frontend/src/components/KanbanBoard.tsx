import type { Task } from "@shared/types";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

interface KanbanBoardProps {
  tasks: Task[];
  onDelete: (id: string) => void;
  onUpdatePriority: (id: string, priority: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
}

export function KanbanBoard({
  tasks,
  onDelete,
  onUpdatePriority,
  onUpdateStatus,
}: KanbanBoardProps) {
  const STATUSES = ["todo", "in-progress", "done"];
  const STATUS_LABELS: Record<string, string> = {
    todo: "To Do",
    "in-progress": "In Progress",
    done: "Done",
  };

  const sensors = useSensors(useSensor(PointerSensor));
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  function SortableTask({ task }: { task: Task }) {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id: String(task.id) });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="bg-gray-900 rounded-lg shadow p-4 border border-primary"
      >
        <h4 className="font-bold text-white">{task.title}</h4>
        {task.description && (
          <p className="text-sm text-gray-300 mt-1">{task.description}</p>
        )}

        {/* Priority dropdown */}
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Priority
          </label>
          <select
            value={task.priority?.trim() || "low"}
            onChange={(e) => onUpdatePriority(task.id, e.target.value)}
            className="appearance-none w-full bg-gray-800 border border-primary text-white rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        {/* Status dropdown (still available manually) */}
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Status
          </label>
          <select
            value={task.status}
            onChange={(e) => onUpdateStatus(task.id, e.target.value)}
            className="appearance-none w-full bg-gray-800 border border-primary text-white rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="todo">Todo</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Due: {task.dueDate || "—"}
        </p>

        <div className="mt-4">
          <button
            onClick={() => onDelete(task.id)}
            className="bg-primary hover:bg-primary-dark text-white text-sm font-medium px-3 py-1.5 rounded-md shadow transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  function DroppableColumn({
    id,
    children,
    title,
  }: {
    id: string;
    title: string;
    children: React.ReactNode;
  }) {
    const { setNodeRef } = useDroppable({ id });
    return (
      <div
        ref={setNodeRef}
        className="bg-gray-800 rounded-xl shadow-md p-4 flex flex-col ring-1 ring-white/10 min-h-[200px]"
      >
        <h3 className="text-lg font-semibold text-white mb-4 border-b border-primary pb-2">
          {title}
        </h3>
        {children}
      </div>
    );
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const overId = String(over?.id);

    setActiveTask(null);
    if (!over) return;

    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    if (STATUSES.includes(overId)) {
      if (task.status !== overId) {
        onUpdateStatus(task.id, overId);
      }
    }
    else {
      const targetTask = tasks.find((t) => t.id === over.id);
      if (targetTask && task.status !== targetTask.status) {
        onUpdateStatus(task.id, targetTask.status);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event) => {
        const task = tasks.find((t) => t.id === event.active.id);
        setActiveTask(task || null);
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {STATUSES.map((status) => (
          <DroppableColumn
            key={status}
            id={status}
            title={STATUS_LABELS[status]}
          >
            <SortableContext
              items={tasks.filter((t) => t.status === status).map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex-1 space-y-4">
                {tasks
                  .filter((t) => t.status === status)
                  .map((task) => (
                    <SortableTask key={task.id} task={task} />
                  ))}
                {tasks.filter((t) => t.status === status).length === 0 && (
                  <p className="text-sm text-gray-500 italic">No tasks</p>
                )}
              </div>
            </SortableContext>
          </DroppableColumn>
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <SortableTask task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
