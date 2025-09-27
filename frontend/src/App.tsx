import { useTasks } from "./hooks/useTasks";
import { KanbanBoard } from "./components/KanbanBoard";
import TaskForm from "./components/TaskForm";

function App() {
  const { tasks, deleteTask, addTask, updatePriority, updateStatus } = useTasks();

  return (
    <div>
      <h1>Tasks</h1>
      <KanbanBoard
        tasks={tasks}
        onDelete={(id) => deleteTask({ variables: { id } })}
        onUpdatePriority={(id, priority) => updatePriority({ variables: { id, priority } })}
        onUpdateStatus={(id, status) => updateStatus({ variables: { id, status } })}
      />
      <TaskForm
        onAdd={(title: string) => addTask({ variables: { title } })}
      />
    </div>
  );
}

export default App;
