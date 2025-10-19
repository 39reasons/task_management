export type TaskStatus = "new" | "active" | "closed";
export type WorkItemType = "EPIC" | "FEATURE" | "STORY" | "TASK" | "BUG";
export type TaskKind = "GENERAL" | "BUG" | "ISSUE";

export interface BugTaskDetails {
  severity?: "low" | "medium" | "high" | "critical" | null;
  is_regression?: boolean | null;
  environment?: string | null;
  steps_to_reproduce?: string | null;
  impact_summary?: string | null;
  reported_version?: string | null;
}

export interface IssueTaskDetails {
  issue_type?: string | null;
  source?: string | null;
  external_reference?: string | null;
  reported_by?: string | null;
  contact_channel?: string | null;
  impact_summary?: string | null;
}

export interface WorkItemComment {
  id: string;
  work_item_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user: User;
}

export interface WorkItem {
  id: string;
  type: WorkItemType;
  task_kind?: TaskKind | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority?: string | null;
  estimate?: number | null;
  due_date?: string | null;
  position?: number | null;
  project_id: string;
  team_id: string;
  stage_id?: string | null;
  backlog_id?: string | null;
  sprint_id?: string | null;
  assignee_id?: string | null;
  assignee?: User | null;
  created_at?: string | null;
  updated_at?: string | null;
  parent_id?: string | null;
  parent?: WorkItem | null;
  children?: WorkItem[];
  tags?: Tag[];
  comments?: WorkItemComment[];
  task?: Task | null;
}

export interface Task {
  id: string;
  type?: WorkItemType;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority?: "low" | "medium" | "high" | null;
  status: TaskStatus;
  stage_id?: string | null;
  project_id: string;
  backlog_id?: string | null;
  sprint_id?: string | null;
  team_id: string;
  tags?: Tag[];
  stage?: Stage | null;
  estimate?: number | null;
  sprint?: Sprint | null;
  position?: number;
  assignee_id?: string | null;
  assignee?: User | null;
  created_at?: string;
  updated_at?: string;
  history?: TaskHistoryEvent[];
  task_kind?: TaskKind;
  parent_id?: string | null;
  children?: WorkItem[];
  bug_details?: BugTaskDetails | null;
  issue_details?: IssueTaskDetails | null;
}

export interface TaskDraftSuggestion {
  title?: string | null;
  description?: string | null;
  priority?: Task["priority"] | null;
  due_date?: string | null;
  tags?: string[];
  subtasks?: string[];
}

export type TaskHistoryEventType = "STATUS_CHANGED" | "ASSIGNEE_CHANGED" | "STAGE_CHANGED" | "TASK_IMPORTED";

export interface TaskHistoryEventPayload {
  [key: string]: unknown;
}

export interface TaskHistoryEvent {
  id: string;
  event_type: TaskHistoryEventType;
  payload: TaskHistoryEventPayload | null;
  created_at: string;
  task_id?: string;
  work_item_id?: string;
  project_id?: string;
  team_id?: string;
  actor_id?: string | null;
  actor?: User | null;
}

export type BoardWorkflowType =
  | "KANBAN"
  | "SCRUM"
  | "BUG_TRACKING"
  | "CONTENT_PIPELINE"
  | "CUSTOM";

export const BOARD_WORKFLOW_TYPES: readonly BoardWorkflowType[] = [
  "KANBAN",
  "SCRUM",
  "BUG_TRACKING",
  "CONTENT_PIPELINE",
  "CUSTOM",
] as const;

export const DEFAULT_BOARD_WORKFLOW_TYPE: BoardWorkflowType = "KANBAN";

export interface BoardStageSuggestion {
  name: string;
  description?: string | null;
}

export interface BoardDraftSuggestion {
  stages: BoardStageSuggestion[];
}

export interface Stage {
  id: string;
  name: string;
  position: number;
  board_id: string;
  tasks: Task[];
}

export interface Board {
  id: string;
  name: string;
  project_id: string;
  team_id: string;
  workflow_type: BoardWorkflowType;
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
  tasks?: Task[];
}

export interface ProjectBoardSummary {
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
  work_item_id: string;
  task_id?: string;
  user: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    avatar_color?: string | null;
  };
}

export interface Sprint {
  id: string;
  project_id: string;
  team_id: string;
  name: string;
  goal?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Notification {
  id: string;
  message: string;
  type: string;
  status: "pending" | "accepted" | "declined";
  is_read: boolean;
  project_id?: string | null;
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
  board_id?: string | null;
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
  project_id: string;
  name: string;
  description?: string | null;
  slug: string;
  created_at?: string;
  updated_at?: string;
  role?: TeamRole | null;
  members?: TeamMember[];
  project?: Project | null;
  boards?: Board[];
  backlogs?: Backlog[];
  sprints?: Sprint[];
  tasks?: Task[];
}

export interface Project {
  id: string;
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
  created_by?: string | null;
  teams?: Team[];
  boards?: ProjectBoardSummary[];
}
