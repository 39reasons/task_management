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
    "todo": "To Do",
    "in-progress": "In Progress",
    "done": "Done",
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {STATUSES.map((status) => (
        <div
          key={status}
          className="bg-gray-50 rounded-xl shadow-md p-4 flex flex-col"
        >
          <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">
            {STATUS_LABELS[status]}
          </h3>
          <div className="flex-1 space-y-4">
            {tasks
              .filter((t) => t.status === status)
              .map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-lg shadow p-4 border border-gray-200"
                >
                  <h4 className="font-bold text-gray-800">{task.title}</h4>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {task.description}
                    </p>
                  )}

                  {/* Priority dropdown */}
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={task.priority ? task.priority.trim() : "low"}
                      onChange={(e) => onUpdatePriority(task.id, e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  {/* Status dropdown */}
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={task.status}
                      onChange={(e) => onUpdateStatus(task.id, e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="todo">Todo</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>

                  {/* Due date */}
                  <p className="text-xs text-gray-500 mt-3">
                    Due: {task.dueDate || "—"}
                  </p>

                  {/* Delete button */}
                  <div className="mt-4">
                    <button
                      onClick={() => onDelete(task.id)}
                      className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            {tasks.filter((t) => t.status === status).length === 0 && (
              <p className="text-sm text-gray-400 italic">No tasks</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
