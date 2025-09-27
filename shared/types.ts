export interface Task {
  id: string;
  title: string;
  completed: boolean;
  description?: string | null;
  dueDate?: string | null;
  priority: "low" | "medium" | "high";
  status: "todo" | "in-progress" | "done";
}

export interface TasksData {
  tasks: Task[];
}
