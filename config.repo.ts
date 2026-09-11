import { db } from "../db";

export interface MessageRow {
  id: number;
  source_id: number;
  telegram_message_id: number;
  raw_text: string | null;
  received_at: string;
}

export interface ConfigRow {
  id: number;
  message_id: number | null;
  protocol: string;
  raw_config: string;
  normalized_config: string;
  host: string | null;
  ip: string | null;
  port: number | null;
  country: string | null;
  region: string | null;
  city: string | null;
  status: "VALID" | "INVALID" | "UNVERIFIED" | "DUPLICATE";
  created_at: string;
}

export const MessageRepo = {
  save(sourceId: number, telegramMessageId: number, rawText: string): MessageRow {
    const info = db
      .prepare(`INSERT INTO messages (source_id, telegram_message_id, raw_text) VALUES (?, ?, ?)`)
      .run(sourceId, telegramMessageId, rawText);
    return db.prepare(`SELECT * FROM messages WHERE id = ?`).get(Number(info.lastInsertRowid)) as MessageRow;
  },
};

export const ConfigRepo = {
  save(data: Omit<ConfigRow, "id" | "created_at">): ConfigRow {
    const info = db
      .prepare(
        `INSERT INTO configs
          (message_id, protocol, raw_config, normalized_config, host, ip, port, country, region, city, status)
         VALUES (@message_id, @protocol, @raw_config, @normalized_config, @host, @ip, @port, @country, @region, @city, @status)`
      )
      .run(data);
    return db.prepare(`SELECT * FROM configs WHERE id = ?`).get(Number(info.lastInsertRowid)) as ConfigRow;
  },

  setStatus(id: number, status: ConfigRow["status"]): void {
    db.prepare(`UPDATE configs SET status = ? WHERE id = ?`).run(status, id);
  },

  countByStatus(status: ConfigRow["status"]): number {
    return (
      db.prepare(`SELECT COUNT(*) c FROM configs WHERE status = ?`).get(status) as { c: number }
    ).c;
  },

  countAll(): number {
    return (db.prepare(`SELECT COUNT(*) c FROM configs`).get() as { c: number }).c;
  },

  lastPublished(): { protocol: string; country: string | null; city: string | null } | undefined {
    return db
      .prepare(
        `SELECT c.protocol, c.country, c.city
         FROM publish_history p JOIN configs c ON c.id = p.config_id
         WHERE p.status = 'PUBLISHED'
         ORDER BY p.published_at DESC LIMIT 1`
      )
      .get() as { protocol: string; country: string | null; city: string | null } | undefined;
  },
};
