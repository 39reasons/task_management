export interface Task {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority?: "low" | "medium" | "high" | null;
  stage_id: string;
  project_id: string;
  assigned_to?: string | null;
  tags?: Tag[];
  stage?: Stage;
}

export interface Stage {
  id: string;
  name: string;
  position: number;
  workflow_id: string;
  tasks: Task[];
}

export interface Workflow {
  id: string;
  name: string;
  project_id: string;
  stages: Stage[];
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

export interface DecodedToken {
  id: string;
  username: string;
  name: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string | null;
}

export interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  task_id: string;
  user: {
    id: string;
    username: string;
    name: string;
  };
}
