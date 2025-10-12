BEGIN;

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

ALTER TABLE projects
  ADD COLUMN team_id UUID;

WITH sanitized_users AS (
  SELECT
    u.id AS user_id,
    CONCAT(u.first_name, ' ', u.last_name, '''s Workspace') AS team_name,
    COALESCE(
      NULLIF(regexp_replace(lower(u.username), '[^a-z0-9]+', '-', 'g'), ''),
      'team-' || LEFT(u.id::text, 8)
    ) AS team_slug
  FROM users u
),
inserted AS (
  INSERT INTO teams (name, slug, created_by)
  SELECT team_name, team_slug, user_id
  FROM sanitized_users
  ON CONFLICT (slug) DO NOTHING
  RETURNING id, slug, created_by
),
existing AS (
  SELECT t.id, t.slug, t.created_by
  FROM teams t
  JOIN sanitized_users su ON su.team_slug = t.slug
),
user_team_map AS (
  SELECT DISTINCT
    COALESCE(ins.id, ex.id) AS team_id,
    su.user_id
  FROM sanitized_users su
  LEFT JOIN inserted ins ON ins.slug = su.team_slug
  LEFT JOIN existing ex ON ex.slug = su.team_slug
)
UPDATE projects p
SET team_id = utm.team_id
FROM user_team_map utm
JOIN user_projects up ON up.project_id = p.id AND up.role = 'owner' AND up.user_id = utm.user_id
WHERE p.team_id IS NULL;

WITH member_fallback AS (
  SELECT DISTINCT ON (p.id)
    p.id AS project_id,
    utm.team_id
  FROM projects p
  JOIN user_projects up ON up.project_id = p.id
  JOIN user_team_map utm ON utm.user_id = up.user_id
  WHERE p.team_id IS NULL
  ORDER BY p.id, up.user_id
)
UPDATE projects p
SET team_id = mf.team_id
FROM member_fallback mf
WHERE p.id = mf.project_id AND p.team_id IS NULL;

INSERT INTO teams (id, name, slug)
SELECT gen_random_uuid(), 'Default Team', 'default-team-' || LEFT(gen_random_uuid()::text, 8)
WHERE NOT EXISTS (SELECT 1 FROM teams);

WITH fallback_team AS (
  SELECT id FROM teams ORDER BY created_at LIMIT 1
)
UPDATE projects p
SET team_id = ft.id
FROM fallback_team ft
WHERE p.team_id IS NULL;

ALTER TABLE projects
  ALTER COLUMN team_id SET NOT NULL;

INSERT INTO team_members (team_id, user_id, role, status)
SELECT t.id, t.created_by, 'owner', 'active'
FROM teams t
WHERE t.created_by IS NOT NULL
ON CONFLICT (team_id, user_id) DO UPDATE
  SET role = EXCLUDED.role,
      status = 'active',
      updated_at = now();

INSERT INTO team_members (team_id, user_id, role, status)
SELECT DISTINCT
  p.team_id,
  up.user_id,
  CASE
    WHEN up.role = 'owner' THEN 'owner'
    ELSE 'member'
  END AS role,
  'active' AS status
FROM projects p
JOIN user_projects up ON up.project_id = p.id
ON CONFLICT (team_id, user_id) DO UPDATE
  SET role = CASE
                WHEN EXCLUDED.role = 'owner' THEN 'owner'
                ELSE team_members.role
              END,
      status = 'active',
      updated_at = now();

CREATE INDEX IF NOT EXISTS idx_projects_team ON projects (team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members (user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members (team_id);

COMMIT;
