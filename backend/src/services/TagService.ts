import { query } from "../db/index.js";

export async function addTag(project_id: string, name: string, color?: string) {
  const result = await query(
    `
    INSERT INTO tags (project_id, name, color)
    VALUES ($1, $2, $3)
    ON CONFLICT (project_id, name) DO UPDATE 
      SET color = EXCLUDED.color,
          updated_at = now()
    RETURNING id, name, color, project_id
    `,
    [project_id, name, color ?? null]
  );
  return result.rows[0];
}

export async function getAllTags(project_id: string) {
  const result = await query(
    `
    SELECT id, name, color
    FROM tags
    WHERE project_id = $1
    ORDER BY name ASC
    `,
    [project_id]
  );
  return result.rows;
}

export async function getTagsForTask(task_id: string) {
  const result = await query(
    `
    SELECT t.id, t.name, t.color
    FROM tags t
    JOIN task_tags tt ON tt.tag_id = t.id
    WHERE tt.task_id = $1
    ORDER BY t.name ASC
    `,
    [task_id]
  );
  return result.rows;
}

export async function addTagToTask(
  task_id: string,
  project_id: string,
  name: string,
  color?: string
) {
  const result = await query(
    `
    INSERT INTO tags (project_id, name, color)
    VALUES ($1, $2, $3)
    ON CONFLICT (project_id, name) DO UPDATE 
      SET color = EXCLUDED.color,
          updated_at = now()
    RETURNING id, name, color, project_id
    `,
    [project_id, name, color ?? null]
  );

  const tag = result.rows[0];

  await query(
    `
    INSERT INTO task_tags (task_id, tag_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    `,
    [task_id, tag.id]
  );

  return tag;
}

export async function assignTagToTask(task_id: string, tag_id: string) {
  await query(
    `
    INSERT INTO task_tags (task_id, tag_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    `,
    [task_id, tag_id]
  );

  const result = await query(
    `SELECT id, name, color FROM tags WHERE id = $1`,
    [tag_id]
  );
  return result.rows[0];
}

export async function removeTagFromTask(task_id: string, tag_id: string) {
  await query(
    `
    DELETE FROM task_tags
    WHERE task_id = $1 AND tag_id = $2
    `,
    [task_id, tag_id]
  );
  return true;
}
