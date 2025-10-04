import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { pool } from "./index.js";

async function runMigrations() {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(process.cwd(), "migrations"),
    path.resolve(moduleDir, "../../migrations"),
  ];

  const migrationsDir = candidates.find((dir) => fs.existsSync(dir));

  if (!migrationsDir) {
    throw new Error(
      `Migrations directory not found. Looked in: ${candidates.join(", ")}`
    );
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No migrations to run.");
    return;
  }

  console.log(`Running ${files.length} migration(s) from ${migrationsDir}`);

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, "utf8");

    if (!sql.trim()) {
      continue;
    }

    console.log(`\u2022 Executing ${file}`);

    try {
      await pool.query(sql);
    } catch (error) {
      console.error(`Migration failed in ${file}:`, error);
      throw error;
    }
  }

  console.log("Migrations completed successfully.");
}

runMigrations()
  .catch((error) => {
    console.error("Migration run failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
