import { useTasks } from "./hooks/useTasks";
import { KanbanBoard } from "./components/KanbanBoard/KanbanBoard";
import TaskForm from "./components/TaskForm";

function App() {
  const { tasks, deleteTask, addTask, updatePriority, updateStatus } = useTasks();

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Task Manager
          </h1>
          <p className="text-gray-400 mt-2">
            Manage tasks with drag-and-drop Kanban style organization
          </p>
        </header>

        {/* Kanban Board */}
        <section className="mb-10">
          <KanbanBoard
            tasks={tasks}
            onDelete={(id) => deleteTask({ variables: { id } })}
            onUpdatePriority={(id, priority) =>
              updatePriority({ variables: { id, priority } })
            }
            onUpdateStatus={(id, status) =>
              updateStatus({ variables: { id, status } })
            }
          />
        </section>

        {/* Add Task Form */}
        <section className="bg-gray-800 rounded-xl shadow-lg p-6 ring-1 ring-white/10">
          <h2 className="text-xl font-semibold mb-4 text-white">
            Add a New Task
          </h2>
          <TaskForm
            onAdd={(title: string) => addTask({ variables: { title } })}
          />
        </section>
      </div>
    </div>
  );
}

export default App;
