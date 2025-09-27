import type { Task } from "@shared/types";
import "./KanbanBoard.css";

interface KanbanBoardProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdatePriority: (id: string, priority: string) => void;
}

export function KanbanBoard({ tasks, onToggle, onDelete, onUpdatePriority }: KanbanBoardProps) {
  const STATUSES = ["todo", "in-progress", "done"];

  return (
    <div className="kanban-board">
      {STATUSES.map((status) => (
        <div key={status} className="kanban-column">
          <h3 className="kanban-title">{status}</h3>
          {tasks
            .filter((t) => t.status === status)
            .map((task) => {
              console.log("Task priority:", JSON.stringify(task.priority));
              return (
              <div key={task.id} className="task-card">
                <strong>{task.title}</strong>
                <p>{task.description}</p>
                
                <label>
                  Priority:{" "}
                  <select
                    value={task.priority}
                    onChange={(e) => onUpdatePriority(task.id, e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>

                <br />
                <small>Due: {task.dueDate || "—"}</small>
                <div style={{ marginTop: "0.5rem" }}>
                  <button onClick={() => onToggle(task.id)}>
                    {task.completed ? "Mark Todo" : "Mark Done"}
                  </button>

                  <button onClick={() => onDelete(task.id)}>Delete</button>
                </div>
              </div>
            )})}
        </div>
      ))}
    </div>
  );
}
