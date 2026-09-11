import { db } from "../db";

export const PublishRepo = {
  recordSuccess(configId: number, destinationId: number, telegramMessageId: number): void {
    db.prepare(
      `INSERT INTO publish_history (config_id, destination_id, telegram_message_id, status)
       VALUES (?, ?, ?, 'PUBLISHED')`
    ).run(configId, destinationId, telegramMessageId);
  },

  recordFailure(configId: number, destinationId: number, error: string): void {
    db.prepare(
      `INSERT INTO publish_history (config_id, destination_id, status, error)
       VALUES (?, ?, 'FAILED', ?)`
    ).run(configId, destinationId, error);
  },

  countPublished(): number {
    return (
      db.prepare(`SELECT COUNT(*) c FROM publish_history WHERE status = 'PUBLISHED'`).get() as {
        c: number;
      }
    ).c;
  },

  countFailed(): number {
    return (
      db.prepare(`SELECT COUNT(*) c FROM publish_history WHERE status = 'FAILED'`).get() as { c: number }
    ).c;
  },
};
