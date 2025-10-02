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
import { ModalProvider, useModal } from "./components/ModalStack";
import { TaskModal } from "./components/TaskModal/TaskModal";
import { TagModal } from "./components/TagModal";

function AllTasksPage({
  user,
  onTaskClick,
}: {
  user: AuthUser | null;
  onTaskClick: (task: Task) => void;
}) {
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
        updateTask({ variables: { id: updatedTask.id, ...updatedTask } })
      }
      user={user}
      setSelectedTask={onTaskClick}
    />
  );
}

function AppContent() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const client = useApolloClient();
  const { modals, openModal } = useModal();

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
        setUser({ id: decoded.id, username: decoded.username, name: decoded.name });
      } catch {
        localStorage.removeItem("token");
        setUser(null);
      }
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
            <Routes>
              <Route
                path="/"
                element={<AllTasksPage user={user} onTaskClick={(task) => { setSelectedTask(task); openModal("task"); }} />}
              />
              <Route
                path="/projects/:id"
                element={<AllTasksPage user={user} onTaskClick={(task) => { setSelectedTask(task); openModal("task"); }} />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Stacked Modals */}
      {modals.includes("task") && <TaskModal task={selectedTask} />}
      {modals.includes("tag") && <TagModal task={selectedTask} />}
    </div>
  );
}

function App() {
  return (
    <ModalProvider>
      <AppContent />
    </ModalProvider>
  );
}

export default App;
