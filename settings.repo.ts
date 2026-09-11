import { db } from "../db";

const DEFAULTS: Record<string, string> = {
  duplicate_blocking_enabled: "true",
  duplicate_retention_days: "30",
  publish_unverified: "false",
  publish_delay_ms: "1500",
  geoip_enabled: "true",
  template: "HiVo Configs {flag}\n{location}\n\n```\n{config}\n```",
  log_level: "info",
};

export const SettingsRepo = {
  get(key: string): string {
    const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as
      | { value: string }
      | undefined;
    if (row) return row.value;
    return DEFAULTS[key] ?? "";
  },

  getBool(key: string): boolean {
    return this.get(key) === "true";
  },

  getNumber(key: string): number {
    return Number(this.get(key));
  },

  set(key: string, value: string): void {
    db.prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).run(key, value);
  },

  all(): Record<string, string> {
    const rows = db.prepare(`SELECT key, value FROM settings`).all() as { key: string; value: string }[];
    const merged = { ...DEFAULTS };
    for (const r of rows) merged[r.key] = r.value;
    return merged;
  },
};
