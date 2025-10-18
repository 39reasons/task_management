ALTER TABLE workflows
  ADD COLUMN IF NOT EXISTS workflow_type TEXT;

UPDATE workflows
SET workflow_type = 'KANBAN'
WHERE workflow_type IS NULL;

ALTER TABLE workflows
  ALTER COLUMN workflow_type SET DEFAULT 'KANBAN';

ALTER TABLE workflows
  ALTER COLUMN workflow_type SET NOT NULL;
