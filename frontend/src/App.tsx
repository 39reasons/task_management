import { useState, useEffect } from "react";
import Navbar from "./components/layout/Navbar";
import Sidebar from "./components/layout/Sidebar";
import { ProjectSidebar } from "./components/layout/ProjectSidebar";
import { useApolloClient } from "@apollo/client";
import { jwtDecode } from "jwt-decode";
import type { AuthUser, Task, DecodedToken } from "@shared/types";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { ModalProvider, useModal } from "./components/ModalStack";
import { TaskModal } from "./components/TaskModal/TaskModal";
import { TagModal } from "./components/tags/TagModal";
import { NotificationInbox } from "./components/notifications/NotificationInbox";
import { ProjectInviteModal } from "./components/notifications/ProjectInviteModal";
import { HomePage } from "./pages/HomePage";
import { ProjectBoardPage } from "./pages/ProjectBoardPage";
import { ProjectHomePage } from "./pages/ProjectHomePage";
import { ProjectWorkItemsPage } from "./pages/ProjectWorkItemsPage";
import { ProjectBacklogPage } from "./pages/ProjectBacklogPage";
import { ProjectSprintsPage } from "./pages/ProjectSprintsPage";
import { TeamSettingsPage } from "./pages/TeamSettingsPage";
import SettingsPage from "./pages/SettingsPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import { GET_TASKS } from "./graphql";
import { TeamProvider } from "./providers/TeamProvider";
import { TeamPage } from "./pages/TeamPage";
import { TaskDetailsPage } from "./pages/TaskDetailsPage";

function AppContent() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [inviteProjectId, setInviteProjectId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const client = useApolloClient();
  const navigate = useNavigate();
  const { modals, openModal } = useModal();
  const location = useLocation();
  const isAuthRoute = location.pathname === "/signin" || location.pathname === "/signup";
  const projectMatch = location.pathname.match(/^\/projects\/([^/]+)/);
  const activeProjectId = projectMatch ? projectMatch[1] : null;
  const showProjectSidebar = !isAuthRoute && Boolean(activeProjectId);
  const showTeamSidebar = !isAuthRoute && !showProjectSidebar;

  const handleLogout = async () => {
    localStorage.removeItem("token");
    setUser(null);
    await client.resetStore();
    navigate("/");
  };

  const handleAuthSuccess = async (authUser: AuthUser, token: string) => {
    void token;
    setUser({ ...authUser, avatar_color: authUser.avatar_color ?? null });
    try {
      await client.clearStore();
      client.cache.writeQuery({ query: GET_TASKS, variables: {}, data: { tasks: [] } });
    } catch {
      // ignore hydration errors; UI will refetch as needed
    }
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
          avatar_color: decoded.avatar_color ?? null,
        });
      } catch {
        localStorage.removeItem("token");
        setUser(null);
      }
    }
    setAuthChecked(true);
  }, []);

  return (
    <TeamProvider user={user}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="flex min-w-0 flex-1">
          {showTeamSidebar ? <Sidebar user={user} /> : null}
          {showProjectSidebar && activeProjectId ? (
            <ProjectSidebar projectId={activeProjectId} />
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col">
            <main
              className={
                isAuthRoute ? "flex-1 min-w-0" : "flex-1 min-w-0 px-4 py-6 sm:px-6"
              }
            >
              <div className={isAuthRoute ? "min-w-0" : "mx-auto w-full min-w-0"}>
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
                      <HomePage
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
                      <ProjectHomePage
                        user={user}
                        onInvite={(projectId) => {
                          setInviteProjectId(projectId);
                          openModal("invite");
                        }}
                      />
                    }
                  />
                  <Route
                    path="/projects/:id/workflow"
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
                  <Route
                    path="/projects/:id/work-items"
                    element={<ProjectWorkItemsPage user={user} />}
                  />
                  <Route
                    path="/projects/:id/tasks/:taskId"
                    element={<TaskDetailsPage user={user} />}
                  />
                  <Route
                    path="/projects/:id/backlog"
                    element={
                      <ProjectBacklogPage
                        setSelectedTask={(task) => {
                          setSelectedTask(task);
                          openModal("task");
                        }}
                      />
                    }
                  />
                  <Route
                    path="/projects/:id/sprints"
                    element={<ProjectSprintsPage />}
                  />
                  <Route
                    path="/teams/:teamId"
                    element={<TeamPage user={user} />}
                  />
                  <Route
                    path="/teams/:teamId/settings"
                    element={<TeamSettingsPage user={user} />}
                  />
                  <Route
                    path="/settings"
                    element={
                      authChecked ? (
                        user ? (
                          <SettingsPage
                            onProfileUpdate={(updated) => {
                              setUser(updated);
                            }}
                          />
                        ) : (
                          <Navigate to="/signin" replace state={{ from: "/settings" }} />
                        )
                      ) : (
                        <div className="p-6 text-muted-foreground">Loading settings…</div>
                      )
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </main>
          </div>
        </div>

        {/* Stacked Modals */}
        {modals.includes("task") && (
          <TaskModal
            task={selectedTask}
            currentUser={user}
            onTaskUpdate={(updated) => setSelectedTask(updated)}
          />
        )}
        {modals.includes("tag") && <TagModal task={selectedTask} />}
        {modals.includes("notifications") && <NotificationInbox currentUser={user} />}
        {modals.includes("invite") && (
          <ProjectInviteModal
            projectId={inviteProjectId}
            onClose={() => setInviteProjectId(null)}
          />
        )}
      </div>
    </TeamProvider>
  );
}

export default function App() {
  return (
    <ModalProvider>
      <AppContent />
    </ModalProvider>
  );
}
