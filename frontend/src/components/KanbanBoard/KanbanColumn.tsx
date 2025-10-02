import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import type { Task } from "@shared/types";
import { KanbanTask } from "./KanbanTask";
import { TaskForm } from "../TaskForm";

interface KanbanColumnProps {
  id: Task["status"];
  title: string;
  tasks: Task[];
  onDelete?: (id: string) => void;
  onUpdatePriority: (id: string, priority: Task["priority"]) => void;
  onUpdateStatus: (id: string, status: Task["status"]) => void;
  onTaskClick: (task: Task) => void;
  onAddTask?: (title: string, status: Task["status"], project_id: string) => void;
  selected_project_id: string | null;
}

export function KanbanColumn({
  id,
  title,
  tasks,
  onDelete,
  onUpdatePriority,
  onUpdateStatus,
  onTaskClick,
  onAddTask,
  selected_project_id
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: id! });

  return (
    <div
      ref={setNodeRef}
      className={[
        "bg-gray-800 rounded-xl shadow-md p-4 flex flex-col ring-1 ring-white/10 min-h-[200px]",
        isOver ? "outline outline-primary/60" : ""
      ].join(" ")}
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
              onClick={onTaskClick}
            />
          ))}
          {tasks.length === 0 && (
            <p className="text-sm text-gray-500 italic">No tasks</p>
          )}
        </div>
      </SortableContext>

      {selected_project_id && onAddTask && (
        <TaskForm
          status={id}
          project_id={selected_project_id}
          onAdd={(title, status, project_id) => onAddTask(title, status, project_id)}
        />
      )}
    </div>
  );
}
