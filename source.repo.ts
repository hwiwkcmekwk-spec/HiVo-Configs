import { db } from "../db";

export type SourceStatus = "ONLINE" | "OFFLINE" | "ERROR" | "DISABLED";

export interface SourceRow {
  id: number;
  chat_id: string;
  username: string | null;
  title: string | null;
  status: SourceStatus;
  last_error: string | null;
  added_by: number | null;
  created_at: string;
}

export const SourceRepo = {
  add(chatId: string, username: string | null, title: string | null, addedBy: number): SourceRow {
    const stmt = db.prepare(
      `INSERT INTO sources (chat_id, username, title, status, added_by)
       VALUES (?, ?, ?, 'OFFLINE', ?)`
    );
    const info = stmt.run(chatId, username, title, addedBy);
    return this.getById(Number(info.lastInsertRowid))!;
  },

  getById(id: number): SourceRow | undefined {
    return db.prepare(`SELECT * FROM sources WHERE id = ?`).get(id) as SourceRow | undefined;
  },

  getByChatId(chatId: string): SourceRow | undefined {
    return db.prepare(`SELECT * FROM sources WHERE chat_id = ?`).get(chatId) as SourceRow | undefined;
  },

  listAll(): SourceRow[] {
    return db.prepare(`SELECT * FROM sources ORDER BY created_at DESC`).all() as SourceRow[];
  },

  listEnabled(): SourceRow[] {
    return db
      .prepare(`SELECT * FROM sources WHERE status != 'DISABLED' ORDER BY created_at DESC`)
      .all() as SourceRow[];
  },

  remove(id: number): void {
    db.prepare(`DELETE FROM sources WHERE id = ?`).run(id);
  },

  setStatus(id: number, status: SourceStatus, lastError: string | null = null): void {
    db.prepare(`UPDATE sources SET status = ?, last_error = ? WHERE id = ?`).run(status, lastError, id);
  },

  setEnabled(id: number, enabled: boolean): void {
    db.prepare(`UPDATE sources SET status = ? WHERE id = ?`).run(enabled ? "OFFLINE" : "DISABLED", id);
  },

  count(): { total: number; active: number } {
    const total = (db.prepare(`SELECT COUNT(*) c FROM sources`).get() as { c: number }).c;
    const active = (
      db.prepare(`SELECT COUNT(*) c FROM sources WHERE status IN ('ONLINE','OFFLINE')`).get() as { c: number }
    ).c;
    return { total, active };
  },
};
