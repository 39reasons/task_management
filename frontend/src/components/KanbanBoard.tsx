import type { Task } from "@shared/types";

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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {STATUSES.map((status) => (
        <div
          key={status}
          className="bg-gray-800 rounded-xl shadow-md p-4 flex flex-col ring-1 ring-white/10"
        >
          <h3 className="text-lg font-semibold text-white mb-4 border-b border-primary pb-2">
            {STATUS_LABELS[status]}
          </h3>
          <div className="flex-1 space-y-4">
            {tasks
              .filter((t) => t.status === status)
              .map((task) => (
                <div
                  key={task.id}
                  className="bg-gray-900 rounded-lg shadow p-4 border border-primary"
                >
                  <h4 className="font-bold text-white">{task.title}</h4>
                  {task.description && (
                    <p className="text-sm text-gray-300 mt-1">
                      {task.description}
                    </p>
                  )}

                  {/* Priority dropdown */}
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Priority
                    </label>
                    <select
                      value={task.priority ? task.priority.trim() : "low"}
                      onChange={(e) => onUpdatePriority(task.id, e.target.value)}
                      className="appearance-none w-full bg-gray-800 border border-primary text-white rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  {/* Status dropdown */}
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

                  {/* Due date */}
                  <p className="text-xs text-gray-400 mt-3">
                    Due: {task.dueDate || "—"}
                  </p>

                  {/* Delete button */}
                  <div className="mt-4">
                    <button
                      onClick={() => onDelete(task.id)}
                      className="bg-primary hover:bg-primary-dark text-white text-sm font-medium px-3 py-1.5 rounded-md shadow transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            {tasks.filter((t) => t.status === status).length === 0 && (
              <p className="text-sm text-gray-500 italic">No tasks</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
