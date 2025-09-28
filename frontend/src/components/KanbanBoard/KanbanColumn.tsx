import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import type { Task } from "@shared/types";
import { KanbanTask } from "./KanbanTask";

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  onDelete: (id: string) => void;
  onUpdatePriority: (id: string, priority: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
}

export function KanbanColumn({
  id,
  title,
  tasks,
  onDelete,
  onUpdatePriority,
  onUpdateStatus,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className="bg-gray-800 rounded-xl shadow-md p-4 flex flex-col ring-1 ring-white/10 min-h-[200px]"
    >
      <h3 className="text-lg font-semibold text-white mb-4 border-b border-primary pb-2">
        {title}
      </h3>
      <SortableContext
        items={tasks.map((t) => String(t.id))}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 space-y-4">
          {tasks.map((task) => (
            <KanbanTask
              key={task.id}
              task={task}
              onDelete={onDelete}
              onUpdatePriority={onUpdatePriority}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
          {tasks.length === 0 && (
            <p className="text-sm text-gray-500 italic">No tasks</p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
