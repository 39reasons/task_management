export interface Task {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority: "low" | "medium" | "high";
  status: "todo" | "in-progress" | "done";
  projectId: string;
  assignedTo?: string | null;
}

export interface TasksData {
  tasks: Task[];
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  tasks?: Task[];
}

export interface AuthUser {
  id: string;
  username: string;
  name: string;
}
