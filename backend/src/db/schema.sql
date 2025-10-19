-- Reset existing structures
DROP TABLE IF EXISTS work_item_links CASCADE;
DROP TABLE IF EXISTS bug_items CASCADE;
DROP TABLE IF EXISTS task_items CASCADE;
DROP TABLE IF EXISTS story_items CASCADE;
DROP TABLE IF EXISTS feature_items CASCADE;
DROP TABLE IF EXISTS epic_items CASCADE;
DROP TABLE IF EXISTS task_history_events CASCADE;
DROP TABLE IF EXISTS work_item_tags CASCADE;
DROP TABLE IF EXISTS task_tags CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS work_items CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS sprints CASCADE;
DROP TABLE IF EXISTS stages CASCADE;
DROP TABLE IF EXISTS workflows CASCADE;
DROP TABLE IF EXISTS backlogs CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS user_projects CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP FUNCTION IF EXISTS work_item_links_hierarchy_constraint() CASCADE;
DROP FUNCTION IF EXISTS work_item_subtype_row_constraint() CASCADE;
DROP FUNCTION IF EXISTS work_items_subtype_constraint() CASCADE;
DROP FUNCTION IF EXISTS validate_work_item_subtype(UUID) CASCADE;
DROP TYPE IF EXISTS work_item_type;
DROP TYPE IF EXISTS task_kind;

CREATE TYPE work_item_type AS ENUM ('EPIC', 'FEATURE', 'STORY', 'TASK', 'BUG');
CREATE TYPE task_kind AS ENUM ('GENERAL', 'BUG', 'ISSUE');

-- Core users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_color TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Projects are top-level containers
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  position INT,
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Teams live inside projects
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Membership within teams
CREATE TABLE team_members (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active', -- active, invited, removed
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

-- Project collaborators
CREATE TABLE user_projects (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  PRIMARY KEY (user_id, project_id)
);

-- Team backlogs (collections of planned work)
CREATE TABLE backlogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  position INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Boards/workflows live inside a project's team
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  workflow_type TEXT NOT NULL DEFAULT 'KANBAN',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stages (columns in a board)
CREATE TABLE stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Team sprints
CREATE TABLE sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Work items represent backlog entities with shared fields
CREATE TABLE work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES stages(id) ON DELETE SET NULL,
  backlog_id UUID REFERENCES backlogs(id) ON DELETE SET NULL,
  sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type work_item_type NOT NULL,
  task_kind task_kind,
  position INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT,
  estimate INT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (task_kind IS NULL OR type IN ('TASK', 'BUG'))
);

-- Subtype tables implement class-table inheritance
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

-- Parent/child hierarchy links
CREATE TABLE work_item_links (
  parent_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, child_id),
  UNIQUE (child_id),
  CHECK (parent_id <> child_id)
);

-- Comments on work items
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tags are scoped to a project
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, name)
);

-- Work item <-> Tag mapping
CREATE TABLE work_item_tags (
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (work_item_id, tag_id)
);

-- Notifications can target either a project or a specific team
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Work item history events capture the team/project context
CREATE TABLE task_history_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CTI enforcement helpers
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
    -- Work item was deleted in the same transaction, nothing to validate.
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

-- Hierarchy enforcement
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

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teams_project ON teams (project_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members (user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members (team_id);
CREATE INDEX IF NOT EXISTS idx_user_projects_project_user ON user_projects (project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_backlogs_team ON backlogs (team_id);
CREATE INDEX IF NOT EXISTS idx_workflows_project ON workflows (project_id);
CREATE INDEX IF NOT EXISTS idx_workflows_team ON workflows (team_id);
CREATE INDEX IF NOT EXISTS idx_stages_workflow ON stages (workflow_id);
CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints (project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_team ON sprints (team_id);
CREATE INDEX IF NOT EXISTS idx_work_items_stage_position ON work_items (stage_id, position);
CREATE INDEX IF NOT EXISTS idx_work_items_project ON work_items (project_id);
CREATE INDEX IF NOT EXISTS idx_work_items_team ON work_items (team_id);
CREATE INDEX IF NOT EXISTS idx_work_items_backlog ON work_items (backlog_id, position);
CREATE INDEX IF NOT EXISTS idx_work_items_sprint ON work_items (sprint_id);
CREATE INDEX IF NOT EXISTS idx_work_items_type ON work_items (type);
CREATE INDEX IF NOT EXISTS idx_work_item_links_parent ON work_item_links (parent_id);
CREATE INDEX IF NOT EXISTS idx_work_item_tags_work_item ON work_item_tags (work_item_id);
CREATE INDEX IF NOT EXISTS idx_task_history_events_work_item_created_at ON task_history_events (work_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_history_events_project ON task_history_events (project_id);
CREATE INDEX IF NOT EXISTS idx_task_history_events_team ON task_history_events (team_id);
