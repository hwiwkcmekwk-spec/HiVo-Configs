import { db } from "../db";

export interface DestinationRow {
  id: number;
  chat_id: string;
  title: string | null;
  is_default: number;
  status: "ONLINE" | "OFFLINE" | "DISABLED";
  created_at: string;
}

export const DestinationRepo = {
  add(chatId: string, title: string | null): DestinationRow {
    const isFirst = (db.prepare(`SELECT COUNT(*) c FROM destinations`).get() as { c: number }).c === 0;
    const stmt = db.prepare(
      `INSERT INTO destinations (chat_id, title, is_default, status) VALUES (?, ?, ?, 'ONLINE')`
    );
    const info = stmt.run(chatId, title, isFirst ? 1 : 0);
    return this.getById(Number(info.lastInsertRowid))!;
  },

  getById(id: number): DestinationRow | undefined {
    return db.prepare(`SELECT * FROM destinations WHERE id = ?`).get(id) as DestinationRow | undefined;
  },

  listAll(): DestinationRow[] {
    return db.prepare(`SELECT * FROM destinations ORDER BY created_at DESC`).all() as DestinationRow[];
  },

  getDefault(): DestinationRow | undefined {
    return db.prepare(`SELECT * FROM destinations WHERE is_default = 1 LIMIT 1`).get() as
      | DestinationRow
      | undefined;
  },

  setDefault(id: number): void {
    const tx = db.transaction(() => {
      db.prepare(`UPDATE destinations SET is_default = 0`).run();
      db.prepare(`UPDATE destinations SET is_default = 1 WHERE id = ?`).run(id);
    });
    tx();
  },

  setEnabled(id: number, enabled: boolean): void {
    db.prepare(`UPDATE destinations SET status = ? WHERE id = ?`).run(enabled ? "ONLINE" : "DISABLED", id);
  },

  remove(id: number): void {
    db.prepare(`DELETE FROM destinations WHERE id = ?`).run(id);
  },
};
