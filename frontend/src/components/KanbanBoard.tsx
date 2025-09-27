import type { Task } from "@shared/types";
import "./KanbanBoard.css";

interface KanbanBoardProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdatePriority: (id: string, priority: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
}

export function KanbanBoard({
  tasks,
  onToggle,
  onDelete,
  onUpdatePriority,
  onUpdateStatus,
}: KanbanBoardProps) {
  const STATUSES = ["todo", "in-progress", "done"];

  return (
    <div className="kanban-board">
      {STATUSES.map((status) => (
        <div key={status} className="kanban-column">
          <h3 className="kanban-title">{status}</h3>
          {tasks
            .filter((t) => t.status === status)
            .map((task) => (
              <div
                key={task.id}
                className={`task-card ${task.completed ? "task-done" : ""}`}
              >
                <strong>{task.title}</strong>
                <p>{task.description}</p>

                {/* Priority dropdown */}
                <label>
                  Priority:{" "}
                  <select
                    value={task.priority ? task.priority.trim() : "low"}
                    onChange={(e) =>
                      onUpdatePriority(task.id, e.target.value)
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>

                <br />

                {/* Status dropdown */}
                <label>
                  Status:{" "}
                  <select
                    value={task.status}
                    onChange={(e) => onUpdateStatus(task.id, e.target.value)}
                  >
                    <option value="todo">Todo</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </label>

                <br />

                <small>Due: {task.dueDate || "—"}</small>

                <div style={{ marginTop: "0.5rem" }}>
                  {/* Toggle still flips completed */}
                  <button onClick={() => onToggle(task.id)}>
                    {task.completed ? "Mark Active" : "Mark Done"}
                  </button>
                  <button onClick={() => onDelete(task.id)}>Delete</button>
                </div>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
