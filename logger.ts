import pino from "pino";
import { env } from "../config/env";

/**
 * Fields that must never reach a log line, even accidentally.
 * Applied both via pino's redact option (object fields) and a
 * text-level scrub for anything logged as a plain string.
 */
const REDACTED_PATHS = [
  "session",
  "*.session",
  "botToken",
  "*.botToken",
  "apiHash",
  "*.apiHash",
  "password",
  "*.password",
];

const SECRET_PATTERNS: RegExp[] = [
  /bot\d+:[A-Za-z0-9_-]{30,}/g, // Telegram bot tokens look like "123456:AAExxxx"
];

function scrub(input: string): string {
  let out = input;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  return out;
}

function safeLogLevel(): string {
  try {
    return env.logLevel;
  } catch {
    return "info";
  }
}

const base = pino({
  level: safeLogLevel(),
  redact: { paths: REDACTED_PATHS, censor: "[REDACTED]" },
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" },
        },
});

export interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  meta?: Record<string, unknown>;
  time: string;
}

const RING_BUFFER_SIZE = 200;
const recentLogs: LogEntry[] = [];

function record(level: LogEntry["level"], msg: string, meta?: Record<string, unknown>): void {
  recentLogs.push({ level, message: msg, meta, time: new Date().toISOString() });
  if (recentLogs.length > RING_BUFFER_SIZE) recentLogs.shift();
}

export function getRecentLogs(level?: LogEntry["level"], limit = 20): LogEntry[] {
  const filtered = level ? recentLogs.filter((l) => l.level === level) : recentLogs;
  return filtered.slice(-limit).reverse();
}

/**
 * Thin wrapper so call sites can do logger.info("New message detected")
 * exactly like the spec's log examples, while every string argument is
 * still scrubbed for accidentally-embedded secrets.
 */
export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => {
    record("debug", msg, meta);
    base.debug(meta ?? {}, scrub(msg));
  },
  info: (msg: string, meta?: Record<string, unknown>) => {
    record("info", msg, meta);
    base.info(meta ?? {}, scrub(msg));
  },
  warn: (msg: string, meta?: Record<string, unknown>) => {
    record("warn", msg, meta);
    base.warn(meta ?? {}, scrub(msg));
  },
  error: (msg: string, meta?: Record<string, unknown>) => {
    record("error", msg, meta);
    base.error(meta ?? {}, scrub(msg));
  },
};
