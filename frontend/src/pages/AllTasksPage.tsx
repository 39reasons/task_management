import { KanbanBoard } from "../components/KanbanBoard/KanbanBoard";
import { useTasks } from "../hooks/useTasks";
import type { AuthUser, Task } from "@shared/types";

export function AllTasksPage({
  user,
  setSelectedTask,
}: {
  user: AuthUser | null;
  setSelectedTask: (task: Task) => void;
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
      setSelectedTask={setSelectedTask}
    />
  );
}
