export interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export type TasksData = {
  tasks: Task[];
};