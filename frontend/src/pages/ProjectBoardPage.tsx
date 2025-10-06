import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@apollo/client";
import { KanbanBoard } from "../components/KanbanBoard/KanbanBoard";
import { useProjectBoard } from "../hooks/useProjectBoard";
import { GET_PROJECTS } from "../graphql";
import type { AuthUser, Task, Project } from "@shared/types";
import { Sparkles, Loader2 } from "lucide-react";

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
    generateWorkflowStages: generateWorkflowStagesFromAI,
    reorderStage,
    deleteStage,
    reorderStagesOrder,
    loading,
  } = useProjectBoard();

  const [isWorkflowPromptOpen, setIsWorkflowPromptOpen] = useState(false);
  const [workflowPrompt, setWorkflowPrompt] = useState("");
  const [workflowPromptError, setWorkflowPromptError] = useState<string | null>(null);
  const [isGeneratingWorkflow, setIsGeneratingWorkflow] = useState(false);

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

  const handleGenerateWorkflow = useCallback(async () => {
    const trimmed = workflowPrompt.trim();
    if (!trimmed) {
      setWorkflowPromptError("Describe the workflow you'd like to generate.");
      return;
    }

    setWorkflowPromptError(null);
    setIsGeneratingWorkflow(true);
    try {
      await generateWorkflowStagesFromAI(trimmed);
      setIsWorkflowPromptOpen(false);
      setWorkflowPrompt("");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.replace(/^GraphQL error:\s*/i, "")
          : "Failed to generate workflow.";
      setWorkflowPromptError(message || "Failed to generate workflow.");
    } finally {
      setIsGeneratingWorkflow(false);
    }
  }, [workflowPrompt, generateWorkflowStagesFromAI]);

  const handleCancelWorkflowPrompt = useCallback(() => {
    setIsWorkflowPromptOpen(false);
    setWorkflowPromptError(null);
  }, []);

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
                type="button"
                onClick={() => {
                  setWorkflowPromptError(null);
                  setIsWorkflowPromptOpen((open) => !open);
                }}
                disabled={isGeneratingWorkflow}
                className="inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-100 shadow transition hover:border-blue-300/70 hover:bg-blue-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {isWorkflowPromptOpen ? "Close AI Workflow" : "Generate AI Workflow"}
              </button>
            ) : null}
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
        {user && projectId && isWorkflowPromptOpen ? (
          <div className="mt-4 rounded-2xl border border-blue-500/40 bg-blue-500/10 p-4 shadow-inner shadow-blue-900/20">
            <div className="space-y-2">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-blue-100">Describe the workflow you need</p>
                <p className="text-xs text-blue-200/80">
                  Mention goals, hand-offs, or constraints. We'll suggest stage names in order and add them to your board.
                </p>
              </div>
              <textarea
                value={workflowPrompt}
                onChange={(event) => {
                  setWorkflowPrompt(event.target.value);
                  if (workflowPromptError) {
                    setWorkflowPromptError(null);
                  }
                }}
                placeholder="e.g. A software release pipeline from idea to deployment with QA and launch"
                className="min-h-[100px] w-full rounded-xl border border-blue-500/40 bg-blue-500/5 px-4 py-3 text-sm text-blue-50 placeholder-blue-200/60 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                disabled={isGeneratingWorkflow}
              />
              {workflowPromptError ? (
                <p className="text-sm text-red-300">{workflowPromptError}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleGenerateWorkflow()}
                  disabled={isGeneratingWorkflow}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGeneratingWorkflow ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate workflow
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancelWorkflowPrompt}
                  disabled={isGeneratingWorkflow}
                  className="rounded-lg px-4 py-2 text-sm text-blue-100 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:text-blue-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}
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
