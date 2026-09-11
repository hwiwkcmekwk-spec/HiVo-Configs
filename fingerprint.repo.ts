import { db } from "../db";

export const FingerprintRepo = {
  find(fingerprint: string): { config_id: number } | undefined {
    return db
      .prepare(`SELECT config_id FROM config_fingerprints WHERE fingerprint = ?`)
      .get(fingerprint) as { config_id: number } | undefined;
  },

  save(fingerprint: string, configId: number): void {
    db.prepare(`INSERT INTO config_fingerprints (fingerprint, config_id) VALUES (?, ?)`).run(
      fingerprint,
      configId
    );
  },

  touch(fingerprint: string): void {
    db.prepare(`UPDATE config_fingerprints SET last_seen_at = datetime('now') WHERE fingerprint = ?`).run(
      fingerprint
    );
  },

  count(): number {
    return (db.prepare(`SELECT COUNT(*) c FROM config_fingerprints`).get() as { c: number }).c;
  },
};
