import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `[HiVo Configs] Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env and fill it in.`
    );
  }
  return value.trim();
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : fallback;
}

function parseAdminIds(raw: string): number[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const n = Number(s);
      if (!Number.isInteger(n)) {
        throw new Error(`[HiVo Configs] Invalid ADMIN_IDS entry: "${s}" is not a numeric Telegram ID`);
      }
      return n;
    });
}

export interface Env {
  telegramApiId: number;
  telegramApiHash: string;
  telegramSession: string;
  botToken: string;
  adminIds: number[];
  databasePath: string;
  geoipDbPath: string;
  publishDelayMs: number;
  port: number;
  logLevel: string;
}

function loadEnv(): Env {
  const apiIdRaw = required("TELEGRAM_API_ID");
  const apiId = Number(apiIdRaw);
  if (!Number.isInteger(apiId)) {
    throw new Error("[HiVo Configs] TELEGRAM_API_ID must be a numeric value");
  }

  const env: Env = {
    telegramApiId: apiId,
    telegramApiHash: required("TELEGRAM_API_HASH"),
    // Session may legitimately be empty on the very first run (before login).
    telegramSession: optional("TELEGRAM_SESSION", ""),
    botToken: required("BOT_TOKEN"),
    adminIds: parseAdminIds(required("ADMIN_IDS")),
    databasePath: optional("DATABASE_PATH", "./data/hivo-configs.db"),
    geoipDbPath: optional("GEOIP_DB_PATH", "./data/GeoLite2-City.mmdb"),
    publishDelayMs: Number(optional("PUBLISH_DELAY_MS", "1500")),
    port: Number(optional("PORT", "3000")),
    logLevel: optional("LOG_LEVEL", "info"),
  };

  // Make sure the directory for the database file exists.
  const dbDir = path.dirname(env.databasePath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  return env;
}

let cachedEnv: Env | null = null;

function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = loadEnv();
  }
  return cachedEnv;
}

/**
 * Lazily validated: importing this module never throws by itself (so
 * pure-logic modules like the parsers can be unit-tested without a
 * real .env file). Validation runs the first time any property is
 * actually read, which in practice is at real startup (index.ts) or
 * inside code paths that need Telegram/DB config.
 */
export const env: Env = new Proxy({} as Env, {
  get(_target, prop: keyof Env) {
    return getEnv()[prop];
  },
});
