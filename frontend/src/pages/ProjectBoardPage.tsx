import { KanbanBoard } from "../components/KanbanBoard/KanbanBoard";
import { useTasks } from "../hooks/useTasks";
import type { AuthUser, Task } from "@shared/types";

export function ProjectBoardPage({
  user,
  setSelectedTask,
}: {
  user: AuthUser | null;
  setSelectedTask: (task: Task) => void;
}) {
  const { tasks, deleteTask, addTask, updatePriority, updateStatus, updateTask } = useTasks();

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
      onAddTask={(title, status, project_id) => {
        if (!project_id) return;
        addTask(project_id, title, status);
      }}
      user={user}
      setSelectedTask={setSelectedTask}
    />
  );
}
