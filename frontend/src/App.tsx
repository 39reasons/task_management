import { useState } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { KanbanBoard } from "./components/KanbanBoard/KanbanBoard";
import { useTasks } from "./hooks/useTasks";
import type { Task } from "@shared/types";

function App() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [user, setUser] = useState<{ username: string } | null>(null);

  const {
    tasks,
    deleteTask,
    addTask,
    updatePriority,
    updateStatus,
    updateTask,
  } = useTasks(selectedProjectId);

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      {/* Navbar at the top */}
      <Navbar
        user={user}
        onLogin={(user, token) => {
          localStorage.setItem("token", token);
          setUser(user);
        }}
        onLogout={() => {
          localStorage.removeItem("token");
          setUser(null);
        }}
      />

      <div className="flex flex-1">
        {/* Sidebar on the left */}
        <Sidebar
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
        />

        {/* Main content area */}
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
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
                selectedProjectId={selectedProjectId}
              />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
