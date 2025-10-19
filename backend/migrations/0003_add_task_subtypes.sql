BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'work_item_type'
  ) THEN
    CREATE TYPE work_item_type AS ENUM ('EPIC', 'FEATURE', 'STORY', 'TASK', 'BUG');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'task_kind'
  ) THEN
    CREATE TYPE task_kind AS ENUM ('GENERAL', 'BUG', 'ISSUE');
  END IF;
END
$$;

-- Ensure legacy tasks table has the columns we expect before conversion.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS team_id UUID;

UPDATE tasks t
SET team_id = p.team_id
FROM projects p
WHERE t.team_id IS NULL
  AND p.id = t.project_id;

ALTER TABLE tasks
  ALTER COLUMN team_id SET NOT NULL;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS type TEXT;

UPDATE tasks
SET type = 'TASK'
WHERE type IS NULL;

ALTER TABLE tasks
  ALTER COLUMN type SET NOT NULL;

ALTER TABLE tasks
  ALTER COLUMN type TYPE work_item_type USING UPPER(type)::work_item_type;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS task_kind TEXT;

UPDATE tasks
SET task_kind = 'GENERAL'
WHERE task_kind IS NULL;

ALTER TABLE tasks
  ALTER COLUMN task_kind TYPE task_kind USING UPPER(task_kind)::task_kind;

ALTER TABLE tasks
  ALTER COLUMN task_kind DROP NOT NULL;

-- Prepare constraint namespace before renaming the table.
ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_team_id_fkey;

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_type_check;

-- Convert tasks into work_items (class-table inheritance base table).
ALTER TABLE tasks RENAME TO work_items;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_pkey'
      AND table_name = 'work_items'
  ) THEN
    EXECUTE 'ALTER TABLE work_items RENAME CONSTRAINT tasks_pkey TO work_items_pkey';
  END IF;
END;
$$;

ALTER TABLE work_items
  ADD CONSTRAINT work_items_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE work_items
  ADD CONSTRAINT work_items_task_kind_type_check CHECK (task_kind IS NULL OR type IN ('TASK', 'BUG'));

ALTER TABLE work_items
  ALTER COLUMN task_kind DROP DEFAULT;

ALTER INDEX IF EXISTS idx_tasks_stage_position RENAME TO idx_work_items_stage_position;
ALTER INDEX IF EXISTS idx_tasks_project RENAME TO idx_work_items_project;
ALTER INDEX IF EXISTS idx_tasks_team RENAME TO idx_work_items_team;
ALTER INDEX IF EXISTS idx_tasks_backlog RENAME TO idx_work_items_backlog;
ALTER INDEX IF EXISTS idx_tasks_sprint RENAME TO idx_work_items_sprint;

-- Update dependent tables to reference work_items.
ALTER TABLE comments
  DROP CONSTRAINT IF EXISTS comments_task_id_fkey;

ALTER TABLE comments
  RENAME COLUMN task_id TO work_item_id;

ALTER TABLE comments
  ADD CONSTRAINT comments_work_item_id_fkey FOREIGN KEY (work_item_id) REFERENCES work_items(id) ON DELETE CASCADE;

ALTER TABLE task_tags RENAME TO work_item_tags;

ALTER TABLE work_item_tags
  RENAME COLUMN task_id TO work_item_id;

ALTER TABLE work_item_tags
  DROP CONSTRAINT IF EXISTS task_tags_pkey;

ALTER TABLE work_item_tags
  ADD CONSTRAINT work_item_tags_pkey PRIMARY KEY (work_item_id, tag_id);

ALTER TABLE work_item_tags
  DROP CONSTRAINT IF EXISTS task_tags_task_id_fkey;

ALTER TABLE work_item_tags
  ADD CONSTRAINT work_item_tags_work_item_id_fkey FOREIGN KEY (work_item_id) REFERENCES work_items(id) ON DELETE CASCADE;

ALTER TABLE work_item_tags
  DROP CONSTRAINT IF EXISTS task_tags_tag_id_fkey;

ALTER TABLE work_item_tags
  ADD CONSTRAINT work_item_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;

ALTER INDEX IF EXISTS idx_task_tags_task RENAME TO idx_work_item_tags_work_item;

ALTER TABLE task_history_events
  DROP CONSTRAINT IF EXISTS task_history_events_task_id_fkey;

ALTER TABLE task_history_events
  RENAME COLUMN task_id TO work_item_id;

ALTER TABLE task_history_events
  ADD CONSTRAINT task_history_events_work_item_id_fkey FOREIGN KEY (work_item_id) REFERENCES work_items(id) ON DELETE CASCADE;

ALTER INDEX IF EXISTS idx_task_history_events_task_created_at
  RENAME TO idx_task_history_events_work_item_created_at;

-- New subtype tables and hierarchy links.
CREATE TABLE epic_items (
  work_item_id UUID PRIMARY KEY REFERENCES work_items(id) ON DELETE CASCADE
);

CREATE TABLE feature_items (
  work_item_id UUID PRIMARY KEY REFERENCES work_items(id) ON DELETE CASCADE
);

CREATE TABLE story_items (
  work_item_id UUID PRIMARY KEY REFERENCES work_items(id) ON DELETE CASCADE
);

CREATE TABLE task_items (
  work_item_id UUID PRIMARY KEY REFERENCES work_items(id) ON DELETE CASCADE
);

CREATE TABLE bug_items (
  work_item_id UUID PRIMARY KEY REFERENCES work_items(id) ON DELETE CASCADE
);

CREATE TABLE work_item_links (
  parent_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, child_id),
  UNIQUE (child_id),
  CHECK (parent_id <> child_id)
);

-- Backfill subtype rows for existing tasks.
INSERT INTO task_items (work_item_id)
SELECT id FROM work_items WHERE type = 'TASK'
ON CONFLICT DO NOTHING;

INSERT INTO bug_items (work_item_id)
SELECT id FROM work_items WHERE type = 'BUG'
ON CONFLICT DO NOTHING;

-- Enforcement functions and triggers for CTI.
CREATE OR REPLACE FUNCTION validate_work_item_subtype(p_work_item_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  base_type work_item_type;
  has_epic BOOLEAN;
  has_feature BOOLEAN;
  has_story BOOLEAN;
  has_task BOOLEAN;
  has_bug BOOLEAN;
  subtype_total INT;
BEGIN
  SELECT type INTO base_type FROM work_items WHERE id = p_work_item_id;

  IF base_type IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS(SELECT 1 FROM epic_items WHERE work_item_id = p_work_item_id),
         EXISTS(SELECT 1 FROM feature_items WHERE work_item_id = p_work_item_id),
         EXISTS(SELECT 1 FROM story_items WHERE work_item_id = p_work_item_id),
         EXISTS(SELECT 1 FROM task_items WHERE work_item_id = p_work_item_id),
         EXISTS(SELECT 1 FROM bug_items WHERE work_item_id = p_work_item_id)
    INTO has_epic, has_feature, has_story, has_task, has_bug;

  subtype_total :=
    (has_epic::INT + has_feature::INT + has_story::INT + has_task::INT + has_bug::INT);

  IF subtype_total <> 1 THEN
    RAISE EXCEPTION
      'Work item % must have exactly one subtype row (found %).',
      p_work_item_id,
      subtype_total;
  END IF;

  CASE base_type
    WHEN 'EPIC' THEN
      IF NOT has_epic THEN
        RAISE EXCEPTION 'Work item % expects an epic_items row.', p_work_item_id;
      END IF;
    WHEN 'FEATURE' THEN
      IF NOT has_feature THEN
        RAISE EXCEPTION 'Work item % expects a feature_items row.', p_work_item_id;
      END IF;
    WHEN 'STORY' THEN
      IF NOT has_story THEN
        RAISE EXCEPTION 'Work item % expects a story_items row.', p_work_item_id;
      END IF;
    WHEN 'TASK' THEN
      IF NOT has_task THEN
        RAISE EXCEPTION 'Work item % expects a task_items row.', p_work_item_id;
      END IF;
    WHEN 'BUG' THEN
      IF NOT has_bug THEN
        RAISE EXCEPTION 'Work item % expects a bug_items row.', p_work_item_id;
      END IF;
    ELSE
      RAISE EXCEPTION 'Unknown work item type % for item %.', base_type, p_work_item_id;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION work_items_subtype_constraint()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM validate_work_item_subtype(NEW.id);
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER work_items_subtype_check
AFTER INSERT OR UPDATE ON work_items
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION work_items_subtype_constraint();

CREATE OR REPLACE FUNCTION work_item_subtype_row_constraint()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_id UUID := COALESCE(NEW.work_item_id, OLD.work_item_id);
BEGIN
  IF target_id IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM validate_work_item_subtype(target_id);
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER epic_items_subtype_check
AFTER INSERT OR UPDATE OR DELETE ON epic_items
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION work_item_subtype_row_constraint();

CREATE CONSTRAINT TRIGGER feature_items_subtype_check
AFTER INSERT OR UPDATE OR DELETE ON feature_items
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION work_item_subtype_row_constraint();

CREATE CONSTRAINT TRIGGER story_items_subtype_check
AFTER INSERT OR UPDATE OR DELETE ON story_items
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION work_item_subtype_row_constraint();

CREATE CONSTRAINT TRIGGER task_items_subtype_check
AFTER INSERT OR UPDATE OR DELETE ON task_items
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION work_item_subtype_row_constraint();

CREATE CONSTRAINT TRIGGER bug_items_subtype_check
AFTER INSERT OR UPDATE OR DELETE ON bug_items
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION work_item_subtype_row_constraint();

-- Hierarchy validation for work item links.
CREATE OR REPLACE FUNCTION work_item_links_hierarchy_constraint()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  parent_type TEXT;
  child_type TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN NULL;
  END IF;

  SELECT type INTO parent_type FROM work_items WHERE id = NEW.parent_id;
  SELECT type INTO child_type FROM work_items WHERE id = NEW.child_id;

  IF parent_type IS NULL THEN
    RAISE EXCEPTION 'Parent work item % not found for link.', NEW.parent_id;
  END IF;

  IF child_type IS NULL THEN
    RAISE EXCEPTION 'Child work item % not found for link.', NEW.child_id;
  END IF;

  IF NEW.parent_id = NEW.child_id THEN
    RAISE EXCEPTION 'Work item % cannot be linked to itself.', NEW.parent_id;
  END IF;

  CASE parent_type
    WHEN 'EPIC' THEN
      IF child_type <> 'FEATURE' THEN
        RAISE EXCEPTION
          'Epics may only parent features (parent %, child %).',
          NEW.parent_id,
          NEW.child_id;
      END IF;
    WHEN 'FEATURE' THEN
      IF child_type <> 'STORY' THEN
        RAISE EXCEPTION
          'Features may only parent stories (parent %, child %).',
          NEW.parent_id,
          NEW.child_id;
      END IF;
    WHEN 'STORY' THEN
      IF child_type NOT IN ('TASK', 'BUG') THEN
        RAISE EXCEPTION
          'Stories may only parent tasks or bugs (parent %, child %).',
          NEW.parent_id,
          NEW.child_id;
      END IF;
    ELSE
      RAISE EXCEPTION
        'Only epics, features, and stories may be parents (parent %, type %).',
        NEW.parent_id,
        parent_type;
  END CASE;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER work_item_links_hierarchy_check
AFTER INSERT OR UPDATE ON work_item_links
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION work_item_links_hierarchy_constraint();

-- Updated indexes aligned with the new structure.
CREATE INDEX IF NOT EXISTS idx_work_items_type ON work_items (type);
CREATE INDEX IF NOT EXISTS idx_work_item_links_parent ON work_item_links (parent_id);
CREATE INDEX IF NOT EXISTS idx_work_item_tags_work_item ON work_item_tags (work_item_id);
CREATE INDEX IF NOT EXISTS idx_task_history_events_work_item_created_at ON task_history_events (work_item_id, created_at DESC);

COMMIT;
