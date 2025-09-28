export interface Task {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority: "low" | "medium" | "high";
  status: "todo" | "in-progress" | "done";
  projectId: string;
}

export interface TasksData {
  tasks: Task[];
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  tasks?: Task[];
}