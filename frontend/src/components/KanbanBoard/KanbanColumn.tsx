import type { Task } from "@shared/types";
import { KanbanTask } from "./KanbanTask";
import { TaskForm } from "../TaskForm";
import { useDroppable } from "@dnd-kit/core";

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  onDelete?: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onAddTask?: (title: string, status: Task["status"], project_id: string | null) => void;
  selected_project_id: string | null;
}

export function KanbanColumn({
  id,
  title,
  tasks,
  onDelete,
  onTaskClick,
  onAddTask,
  selected_project_id,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="bg-gray-800 rounded-lg p-4 shadow border border-gray-700">
      <h3 className="font-semibold text-white mb-3">{title}</h3>
      <div>
        {tasks.map((task) => (
          <KanbanTask
            key={task.id}
            task={task}
            onDelete={onDelete}
            onClick={onTaskClick}
          />
        ))}
      </div>
      {onAddTask && (
        <TaskForm
          status={id as Task["status"]}
          project_id={selected_project_id}
          onAdd={onAddTask}
        />
      )}
    </div>
  );
}
