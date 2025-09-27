import { useTasks } from "./hooks/useTasks";
import { KanbanBoard } from "./components/KanbanBoard";
import TaskForm from "./components/TaskForm";

function App() {
  const { tasks, toggleTask, deleteTask, addTask, updatePriority } = useTasks();

  return (
    <div>
      <h1>Tasks</h1>
      <KanbanBoard
        tasks={tasks}
        onToggle={(id) => toggleTask({ variables: { id } })}
        onDelete={(id) => deleteTask({ variables: { id } })}
        onUpdatePriority={(id, priority) => updatePriority({ variables: { id, priority } })}
      />
      <TaskForm
        onAdd={(title: string) => addTask({ variables: { title } })}
      />
    </div>
  );
}

export default App;
