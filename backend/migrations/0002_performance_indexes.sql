-- Add supporting indexes to speed up task board operations
CREATE INDEX IF NOT EXISTS idx_tasks_stage_position ON tasks (stage_id, position);
CREATE INDEX IF NOT EXISTS idx_tasks_stage_id ON tasks (stage_id);
CREATE INDEX IF NOT EXISTS idx_stages_workflow ON stages (workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflows_project ON workflows (project_id);
CREATE INDEX IF NOT EXISTS idx_user_projects_project_user ON user_projects (project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_task_members_task ON task_members (task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_task ON task_tags (task_id);
