import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { useApolloClient } from "@apollo/client";
import { jwtDecode } from "jwt-decode";
import type { AuthUser, Task, DecodedToken } from "@shared/types";
import { Routes, Route, Navigate } from "react-router-dom";
import AuthModal from "./components/auth/AuthModal";
import { ModalProvider, useModal } from "./components/ModalStack";
import { TaskModal } from "./components/TaskModal/TaskModal";
import { TagModal } from "./components/TagModal";
import { AllTasksPage } from "./pages/AllTasksPage";
import { ProjectBoardPage } from "./pages/ProjectBoardPage";

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
        setUser({
          id: decoded.id,
          username: decoded.username,
          name: decoded.name,
        });
      } catch {
        localStorage.removeItem("token");
        setUser(null);
      }
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

      {/* Layout */}
      <div className="flex flex-1">
        <Sidebar user={user} />

        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            <Routes>
              <Route
                path="/"
                element={
                  <AllTasksPage
                    user={user}
                    setSelectedTask={(task) => {
                      setSelectedTask(task);
                      openModal("task");
                    }}
                  />
                }
              />
              <Route
                path="/projects/:id"
                element={
                  <ProjectBoardPage
                    user={user}
                    setSelectedTask={(task) => {
                      setSelectedTask(task);
                      openModal("task");
                    }}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Stacked Modals */}
      {modals.includes("task") && <TaskModal task={selectedTask} />}
      {modals.includes("tag") && (
        <TagModal task={selectedTask} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ModalProvider>
      <AppContent />
    </ModalProvider>
  );
}
