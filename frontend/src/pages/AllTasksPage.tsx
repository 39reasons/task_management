import { KanbanBoard } from "../components/KanbanBoard/KanbanBoard";
import { useAllTasksBoard } from "../hooks/useAllTasksBoard";
import type { AuthUser, Task } from "@shared/types";

export function AllTasksPage({
  user,
  setSelectedTask,
}: {
  user: AuthUser | null;
  setSelectedTask: (task: Task) => void;
}) {
  const { stages, deleteTask, moveTask, loading } = useAllTasksBoard();

  if (loading) {
    return <div className="text-white">Loading tasks…</div>;
  }

  return (
    <KanbanBoard
      stages={stages}
      onDelete={user ? (id: Task["id"]) => deleteTask(id) : undefined}
      onMoveTask={moveTask}
      user={user}
      setSelectedTask={setSelectedTask}
    />
  );
}
