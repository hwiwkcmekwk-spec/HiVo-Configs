import { db } from "../db";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function ensureRow(date: string): void {
  db.prepare(`INSERT OR IGNORE INTO statistics (date) VALUES (?)`).run(date);
}

type Counter =
  | "total_messages"
  | "total_configs"
  | "valid_configs"
  | "invalid_configs"
  | "duplicate_configs"
  | "published_configs"
  | "failed_publications";

export const StatsRepo = {
  increment(counter: Counter, amount = 1): void {
    const date = today();
    ensureRow(date);
    db.prepare(`UPDATE statistics SET ${counter} = ${counter} + ? WHERE date = ?`).run(amount, date);
  },

  bumpProtocol(protocol: string): void {
    this.bumpJsonField("per_protocol_json", protocol);
  },

  bumpSource(sourceLabel: string): void {
    this.bumpJsonField("per_source_json", sourceLabel);
  },

  bumpCountry(country: string): void {
    this.bumpJsonField("per_country_json", country);
  },

  bumpJsonField(field: "per_protocol_json" | "per_source_json" | "per_country_json", key: string): void {
    const date = today();
    ensureRow(date);
    const row = db.prepare(`SELECT ${field} as val FROM statistics WHERE date = ?`).get(date) as {
      val: string;
    };
    const map: Record<string, number> = JSON.parse(row.val || "{}");
    map[key] = (map[key] ?? 0) + 1;
    db.prepare(`UPDATE statistics SET ${field} = ? WHERE date = ?`).run(JSON.stringify(map), date);
  },

  getRange(days: number): unknown[] {
    return db
      .prepare(`SELECT * FROM statistics ORDER BY date DESC LIMIT ?`)
      .all(days);
  },

  getToday(): Record<string, unknown> {
    ensureRow(today());
    return db.prepare(`SELECT * FROM statistics WHERE date = ?`).get(today()) as Record<string, unknown>;
  },
};
