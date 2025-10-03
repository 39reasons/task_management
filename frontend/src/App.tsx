import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { useApolloClient } from "@apollo/client";
import { jwtDecode } from "jwt-decode";
import type { AuthUser, Task, DecodedToken } from "@shared/types";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { ModalProvider, useModal } from "./components/ModalStack";
import { TaskModal } from "./components/TaskModal/TaskModal";
import { TagModal } from "./components/TagModal";
import { NotificationInbox } from "./components/NotificationInbox";
import { ProjectInviteModal } from "./components/ProjectInviteModal";
import { MemberModal } from "./components/MemberModal";
import { AllTasksPage } from "./pages/AllTasksPage";
import { ProjectBoardPage } from "./pages/ProjectBoardPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";

function AppContent() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [inviteProjectId, setInviteProjectId] = useState<string | null>(null);

  const client = useApolloClient();
  const navigate = useNavigate();
  const { modals, openModal } = useModal();
  const location = useLocation();
  const isAuthRoute = location.pathname === "/signin" || location.pathname === "/signup";

  const handleLogout = async () => {
    localStorage.removeItem("token");
    setUser(null);
    await client.resetStore();
    navigate("/");
  };

  const handleAuthSuccess = (authUser: AuthUser, _token: string) => {
    setUser(authUser);
    client.resetStore().catch(() => {});
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token);
        setUser({
          id: decoded.id,
          username: decoded.username,
          first_name: decoded.first_name,
          last_name: decoded.last_name,
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
      <Navbar user={user} onLogout={handleLogout} />

      {/* Layout */}
      <div className="flex flex-1">
        {!isAuthRoute && <Sidebar user={user} />}

        <main className={isAuthRoute ? "flex-1" : "flex-1 p-6"}>
          <div className={isAuthRoute ? "" : "max-w-6xl mx-auto"}>
            <Routes>
              <Route
                path="/signin"
                element={<SignInPage onAuthenticated={handleAuthSuccess} />}
              />
              <Route
                path="/signup"
                element={<SignUpPage onAuthenticated={handleAuthSuccess} />}
              />
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
                    onInvite={(projectId) => {
                      setInviteProjectId(projectId);
                      openModal("invite");
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
      {modals.includes("task") && (
        <TaskModal
          task={selectedTask}
          onTaskUpdate={(updated) => setSelectedTask(updated)}
        />
      )}
      {modals.includes("tag") && (
        <TagModal task={selectedTask} />
      )}
      {modals.includes("member") && (
        <MemberModal
          task={selectedTask}
          onAssign={(updated) => setSelectedTask(updated)}
        />
      )}
      {modals.includes("notifications") && <NotificationInbox />}
      {modals.includes("invite") && (
        <ProjectInviteModal
          projectId={inviteProjectId}
          onClose={() => setInviteProjectId(null)}
        />
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
