import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { KanbanBoard } from "./components/KanbanBoard/KanbanBoard";
import { useTasks } from "./hooks/useTasks";
import type { AuthUser, Task } from "@shared/types";
import AuthModal from "./components/auth/AuthModal";
import { useApolloClient } from "@apollo/client";
import { jwtDecode } from "jwt-decode";
import type { DecodedToken } from "@shared/types";
import { Routes, Route, Navigate } from "react-router-dom";

function AllTasksPage({ user }: { user: AuthUser | null }) {
  const { tasks, deleteTask, updatePriority, updateStatus, updateTask } = useTasks();

  return (
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
        updateTask({
          variables: {
            id: updatedTask.id,
            title: updatedTask.title,
            description: updatedTask.description,
            due_date: updatedTask.due_date,
            priority: updatedTask.priority,
            status: updatedTask.status,
            assigned_to: updatedTask.assigned_to,
            project_id: updatedTask.project_id,
          },
        })
      }
      user={user}
    />
  );
}

function ProjectBoardPage({ user }: { user: AuthUser | null }) {
  const { tasks, deleteTask, addTask, updatePriority, updateStatus, updateTask, project_id } =
    useTasks();

  return (
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
        updateTask({
          variables: {
            id: updatedTask.id,
            title: updatedTask.title,
            description: updatedTask.description,
            due_date: updatedTask.due_date,
            priority: updatedTask.priority,
            status: updatedTask.status,
            assigned_to: updatedTask.assigned_to,
            project_id: updatedTask.project_id,
          },
        })
      }
      onAddTask={(title, status) => {
        if (!project_id) return;
        addTask(project_id, title, status);
      }}
      user={user}
    />
  );
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const client = useApolloClient();

  const handleLogout = async () => {
    localStorage.removeItem("token");
    setUser(null);
    await client.resetStore();
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token);
        setUser({
          id: decoded.id,
          username: decoded.username,
          name: decoded.name,
        });
      } catch {
        localStorage.removeItem("token");
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <Navbar user={user} onLoginClick={() => setAuthModalOpen(true)} onLogout={handleLogout} />

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
        <Sidebar user={user} />

        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            <section className="mb-10">
              <Routes>
                <Route path="/" element={<AllTasksPage user={user} />} />
                <Route path="/projects/:id" element={<ProjectBoardPage user={user} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
