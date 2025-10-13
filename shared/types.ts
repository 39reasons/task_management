export type TaskStatus = "new" | "active" | "closed";

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority?: "low" | "medium" | "high" | null;
  status: TaskStatus;
  stage_id: string;
  project_id: string;
  team_id?: string;
  tags?: Tag[];
  stage?: Stage;
  position?: number;
  assignees?: User[];
}

export interface BacklogTask {
  id: string;
  backlog_id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  position?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface TaskDraftSuggestion {
  title?: string | null;
  description?: string | null;
  priority?: Task["priority"] | null;
  due_date?: string | null;
  tags?: string[];
  subtasks?: string[];
}

export interface WorkflowStageSuggestion {
  name: string;
  description?: string | null;
}

export interface WorkflowDraftSuggestion {
  stages: WorkflowStageSuggestion[];
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
  team_id?: string;
  stages: Stage[];
}

export interface Backlog {
  id: string;
  team_id: string;
  name: string;
  description?: string | null;
  position?: number | null;
  created_at?: string;
  updated_at?: string;
  tasks?: BacklogTask[];
}

export interface ProjectWorkflowSummary {
  id: string;
  name: string;
  stages?: Array<Pick<Stage, "id">>;
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
  team_id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  tasks?: Task[];
  is_public?: boolean;
  viewer_is_owner?: boolean;
  viewer_role?: TeamRole | null;
  members?: User[];
  position?: number | null;
  team?: Team | null;
  workflows?: ProjectWorkflowSummary[];
  backlogs?: Backlog[];
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
  team_id?: string | null;
  project?: Project | null;
  sender?: User | null;
  created_at: string;
  updated_at: string;
  recipient_id?: string;
}

export type NotificationEventAction = "CREATED" | "UPDATED" | "DELETED";

export interface NotificationEvent {
  action: NotificationEventAction;
  notification?: Notification | null;
  notification_id?: string | null;
}

export const TASK_BOARD_ALL_PROJECTS = "__ALL__";

export type TaskBoardEventAction =
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_DELETED"
  | "TASK_MOVED"
  | "TASKS_REORDERED"
  | "STAGE_CREATED"
  | "STAGE_UPDATED"
  | "STAGE_DELETED"
  | "STAGES_REORDERED";

export interface TaskBoardEvent {
  action: TaskBoardEventAction;
  project_id: string;
  team_id?: string | null;
  workflow_id?: string | null;
  stage_id?: string | null;
  previous_stage_id?: string | null;
  task_id?: string | null;
  task_ids?: string[] | null;
  stage_ids?: string[] | null;
  origin?: string | null;
  timestamp?: string | null;
}

export type TeamRole = "owner" | "admin" | "member" | "viewer";

export interface TeamMember {
  team_id: string;
  user: User;
  role: TeamRole;
  status: "active" | "invited" | "removed";
  created_at?: string;
  updated_at?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  created_at?: string;
  updated_at?: string;
  role?: TeamRole | null;
  members?: TeamMember[];
  projects?: Project[];
}
