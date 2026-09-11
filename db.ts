import Database from "better-sqlite3";
import { env } from "../config/env";
import { logger } from "../logger/logger";

export const db = new Database(env.databasePath);

// WAL mode: much better for a process that writes frequently while
// the admin bot may read concurrently (dashboard/logs/stats).
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("synchronous = NORMAL");

logger.info("Database connected", { path: env.databasePath });
