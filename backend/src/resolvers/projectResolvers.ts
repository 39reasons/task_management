import type { Project, Task } from "@shared/types";
import { query } from "../db/index.js";

export const projectResolvers = {
  Query: {
    projects: async (): Promise<Project[]> => {
      const result = await query<Project>("SELECT * FROM projects ORDER BY id ASC");
      return result.rows;
    },
    project: async (_: unknown, args: { id: string }): Promise<Project> => {
      const projRes = await query<Project>(
        "SELECT * FROM projects WHERE id = $1",
        [args.id]
      );

      if (projRes.rowCount === 0) throw new Error("Project not found");

      const taskRes = await query<Task>(
        `SELECT id, title, description, 
                to_char(due_date, 'YYYY-MM-DD') AS "dueDate",
                priority, status, project_id
         FROM tasks
         WHERE project_id = $1
         ORDER BY id ASC`,
        [args.id]
      );

      return {
        ...projRes.rows[0],
        tasks: taskRes.rows,
      };
    },
  },

  Mutation: {
    addProject: async (_: unknown, args: { name: string; description?: string }): Promise<Project> => {
      const result = await query<Project>(
        "INSERT INTO projects (name, description) VALUES ($1, $2) RETURNING *",
        [args.name, args.description ?? null]
      );
      return result.rows[0];
    },
    deleteProject: async (_: unknown, args: { id: string }): Promise<boolean> => {
      const result = await query<Project>(
        "DELETE FROM projects WHERE id = $1",
        [args.id]
      );
      return (result.rowCount ?? 0) > 0;
    },
  },
};
