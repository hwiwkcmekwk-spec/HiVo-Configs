import * as fs from "fs";
import * as path from "path";
import { db } from "./db";
import { logger } from "../logger/logger";

export function runMigrations(): void {
  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    try {
      db.exec(sql);
      logger.info("Migration applied", { file });
    } catch (err) {
      logger.error("Migration failed", { file, error: String(err) });
      throw err;
    }
  }
}

if (require.main === module) {
  runMigrations();
}
