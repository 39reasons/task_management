import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { KanbanBoard } from "./components/KanbanBoard/KanbanBoard";
import { useTasks } from "./hooks/useTasks";
import type { AuthUser, Task } from "@shared/types";
import AuthModal from "./components/auth/AuthModal";
import { useApolloClient } from "@apollo/client";
import { jwtDecode } from "jwt-decode";

function App() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const client = useApolloClient();

  const {
    tasks,
    deleteTask,
    addTask,
    updatePriority,
    updateStatus,
    updateTask,
  } = useTasks(selectedProjectId);

  const handleLogout = async () => {
    localStorage.removeItem("token");
    setUser(null);
    await client.resetStore();
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        // decode token payload { userId, username, name }
        const decoded: any = jwtDecode(token);
        setUser({
          id: decoded.userId,
          username: decoded.username,
          name: decoded.name,
        });
      } catch {
        // invalid/expired token → clear
        localStorage.removeItem("token");
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, []);

  
  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      {/* Navbar */}
      <Navbar
        user={user}
        onLoginClick={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLogin={(user, token) => {
          localStorage.setItem("token", token);
          setUser(user);
          setAuthModalOpen(false);
        }}
      />

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
          user={user}
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
                user={user}
              />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
