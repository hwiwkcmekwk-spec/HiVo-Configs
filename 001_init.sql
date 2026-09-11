-- HiVo Configs — initial schema
-- Safe to re-run: every statement is IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL UNIQUE,
  username TEXT,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'OFFLINE' CHECK (status IN ('ONLINE','OFFLINE','ERROR','DISABLED')),
  last_error TEXT,
  added_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS destinations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL UNIQUE,
  title TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ONLINE' CHECK (status IN ('ONLINE','OFFLINE','DISABLED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  telegram_message_id INTEGER NOT NULL,
  raw_text TEXT,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_source ON messages(source_id);

CREATE TABLE IF NOT EXISTS configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
  protocol TEXT NOT NULL,
  raw_config TEXT NOT NULL,
  normalized_config TEXT NOT NULL,
  host TEXT,
  ip TEXT,
  port INTEGER,
  country TEXT,
  region TEXT,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (status IN ('VALID','INVALID','UNVERIFIED','DUPLICATE')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_configs_protocol ON configs(protocol);
CREATE INDEX IF NOT EXISTS idx_configs_status ON configs(status);

CREATE TABLE IF NOT EXISTS config_fingerprints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT NOT NULL UNIQUE,
  config_id INTEGER NOT NULL REFERENCES configs(id) ON DELETE CASCADE,
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fingerprint ON config_fingerprints(fingerprint);

CREATE TABLE IF NOT EXISTS publish_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_id INTEGER NOT NULL REFERENCES configs(id) ON DELETE CASCADE,
  destination_id INTEGER NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  telegram_message_id INTEGER,
  status TEXT NOT NULL CHECK (status IN ('PUBLISHED','FAILED')),
  error TEXT,
  published_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_publish_config ON publish_history(config_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  meta TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at);

CREATE TABLE IF NOT EXISTS statistics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  total_messages INTEGER NOT NULL DEFAULT 0,
  total_configs INTEGER NOT NULL DEFAULT 0,
  valid_configs INTEGER NOT NULL DEFAULT 0,
  invalid_configs INTEGER NOT NULL DEFAULT 0,
  duplicate_configs INTEGER NOT NULL DEFAULT 0,
  published_configs INTEGER NOT NULL DEFAULT 0,
  failed_publications INTEGER NOT NULL DEFAULT 0,
  per_protocol_json TEXT NOT NULL DEFAULT '{}',
  per_source_json TEXT NOT NULL DEFAULT '{}',
  per_country_json TEXT NOT NULL DEFAULT '{}'
);
