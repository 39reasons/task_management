import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import { KanbanBoard } from "../components/KanbanBoard/KanbanBoard";
import { useProjectBoard } from "../hooks/useProjectBoard";
import { GET_PROJECTS } from "../graphql";
import type { AuthUser, Task, Project } from "@shared/types";

export function ProjectBoardPage({
  user,
  setSelectedTask,
  onInvite,
}: {
  user: AuthUser | null;
  setSelectedTask: (task: Task) => void;
  onInvite: (projectId: string) => void;
}) {
  const {
    projectId,
    workflow,
    stages,
    createTask,
    deleteTask,
    moveTask,
    addStage,
    reorderStage,
    deleteStage,
    reorderStagesOrder,
    loading,
  } = useProjectBoard();

  const { data: projectsData } = useQuery<{ projects: Project[] }>(GET_PROJECTS, {
    skip: !projectId,
    fetchPolicy: "cache-first",
  });

  const projectName = useMemo(() => {
    if (!projectId) {
      return workflow?.name ?? "Project";
    }
    const match = projectsData?.projects?.find((project) => project.id === projectId);
    return match?.name ?? workflow?.name ?? "Project";
  }, [projectId, projectsData, workflow]);

  if (loading) {
    return <div className="text-white">Loading board…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 px-6 py-4 shadow-lg shadow-slate-900/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-100 tracking-tight">
              {projectName}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {user && projectId ? (
              <button
                onClick={() => onInvite(projectId)}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white shadow transition duration-200 hover:border-blue-400/40 hover:bg-blue-500/15"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-blue-400/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="h-3.5 w-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5.25 9A3.75 3.75 0 1 0 12.75 9a3.75 3.75 0 0 0-7.5 0ZM3 20.25a6 6 0 0 1 12 0M17.25 8.25v6m3-3h-6"
                    />
                  </svg>
                </span>
                <span className="relative">Invite</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="pb-4">
        <KanbanBoard
          stages={stages}
          onDelete={user ? (id: Task["id"]) => deleteTask(id) : undefined}
          onMoveTask={moveTask}
          onReorderTasks={reorderStage}
          onAddTask={user ? (stageId, title) => createTask(stageId, title) : undefined}
          onAddStage={user ? addStage : undefined}
          onDeleteStage={user ? (stageId: string) => deleteStage(stageId) : undefined}
          onReorderStages={user ? (ordered) => reorderStagesOrder(ordered) : undefined}
          user={user}
          setSelectedTask={setSelectedTask}
        />
      </div>
    </div>
  );
}
