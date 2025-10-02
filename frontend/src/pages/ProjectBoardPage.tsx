import { KanbanBoard } from "../components/KanbanBoard/KanbanBoard";
import { useProjectBoard } from "../hooks/useProjectBoard";
import type { AuthUser, Task } from "@shared/types";

export function ProjectBoardPage({
  user,
  setSelectedTask,
}: {
  user: AuthUser | null;
  setSelectedTask: (task: Task) => void;
}) {
  const {
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
  );
}
