export interface Task {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority?: "low" | "medium" | "high" | null;
  stage_id: string;
  project_id: string;
  tags?: Tag[];
  stage?: Stage;
  position?: number;
  assignees?: User[];
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

export interface TaskReorderInput {
  task_id: string;
  stage_id: string;
  position: number;
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
  is_public?: boolean;
  members?: User[];
}

export interface AuthUser {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_color?: string | null;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  created_at?: string;
  updated_at?: string;
  avatar_color?: string | null;
}

export interface DecodedToken {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_color?: string | null;
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
    first_name: string;
    last_name: string;
    avatar_color?: string | null;
  };
}

export interface Notification {
  id: string;
  message: string;
  type: string;
  status: "pending" | "accepted" | "declined";
  is_read: boolean;
  project?: Project | null;
  sender?: User | null;
  created_at: string;
  updated_at: string;
}
