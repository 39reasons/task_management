import { KanbanBoard } from "../components/KanbanBoard/KanbanBoard";
import { useProjectBoard } from "../hooks/useProjectBoard";
import type { AuthUser, Task } from "@shared/types";

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
    stages,
    createTask,
    deleteTask,
    moveTask,
    addStage,
    reorderStage,
    deleteStage,
    loading,
  } = useProjectBoard();

  if (loading) {
    return <div className="text-white">Loading board…</div>;
  }

  return (
    <div className="space-y-4">
      {user && projectId && (
        <div className="flex justify-end">
          <button
            onClick={() => onInvite(projectId)}
            className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm"
          >
            Invite Member
          </button>
        </div>
      )}
      <KanbanBoard
        stages={stages}
        onDelete={user ? (id: Task["id"]) => deleteTask(id) : undefined}
        onMoveTask={moveTask}
        onReorderTasks={reorderStage}
        onAddTask={user ? (stageId, title) => createTask(stageId, title) : undefined}
        onAddStage={user ? addStage : undefined}
        onDeleteStage={user ? (stageId: string) => deleteStage(stageId) : undefined}
        user={user}
        setSelectedTask={setSelectedTask}
      />
    </div>
  );
}
