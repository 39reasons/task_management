import { useState } from "react";
import type { Task } from "@shared/types";
import { useTasks } from "./hooks/useTasks";
import { KanbanBoard } from "./components/KanbanBoard/KanbanBoard";
import Sidebar from "./components/Sidebar";

function App() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const {
    tasks,
    deleteTask,
    addTask,
    updatePriority,
    updateStatus,
    updateTask,
  } = useTasks(selectedProjectId);

  return (
    <div className="flex min-h-screen bg-gray-900">
      {/* Sidebar on the left */}
      <Sidebar
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
      />

      {/* Main content area */}
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <header className="mb-8 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              Task Manager
            </h1>
            <p className="text-gray-400 mt-2">
              Manage tasks with drag-and-drop Kanban style organization
            </p>
          </header>

          {/* Kanban Board */}
          <section className="mb-10">
            <KanbanBoard
              tasks={tasks}
              onDelete={(id: Task["id"]) => deleteTask({ variables: { id } })}
              onUpdatePriority={(id: Task["id"], priority: Task["priority"]) =>
                updatePriority({ variables: { id, priority } })
              }
              onUpdateStatus={(id: Task["id"], status: Task["status"]) =>
                updateStatus({ variables: { id, status } })
              }
              onUpdateTask={(updatedTask: Partial<Task>) =>
                updateTask({ variables: updatedTask })
              }
              onAddTask={(title, status) => {
                if (!selectedProjectId) return;
                addTask({
                  variables: {
                    projectId: selectedProjectId,
                    title,
                    status,
                  },
                });
              }}
              selectedProjectId={selectedProjectId}/>
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
