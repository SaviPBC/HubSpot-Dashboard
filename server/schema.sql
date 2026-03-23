CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS local_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'support',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  created_by    TEXT
);

CREATE TABLE IF NOT EXISTS deals (
  id          TEXT PRIMARY KEY,
  name        TEXT,
  pipeline    TEXT,
  stage_id    TEXT,
  size_value  TEXT,
  network_value TEXT,
  created_at  TEXT,
  close_date  TEXT,
  launched_at          TEXT,
  contract_start_date    TEXT,
  contract_end_date      TEXT,
  contract_renewal_date  TEXT,
  pricing_model          TEXT,
  deal_source            TEXT,
  synced_at              TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  pipeline_id TEXT
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at    TEXT NOT NULL,
  completed_at  TEXT,
  status        TEXT NOT NULL DEFAULT 'running',
  deals_fetched INTEGER DEFAULT 0,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS zoom_webinars (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  webinar_id TEXT UNIQUE,
  topic      TEXT,
  start_time TEXT,
  quarter    TEXT,
  year       INTEGER,
  synced_at  TEXT
);

CREATE TABLE IF NOT EXISTS zoom_attendees (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  webinar_id TEXT,
  name       TEXT,
  email      TEXT,
  join_time  TEXT,
  duration   INTEGER,
  UNIQUE(webinar_id, email)
);

CREATE TABLE IF NOT EXISTS eventbrite_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id   TEXT UNIQUE,
  name       TEXT,
  start_time TEXT,
  quarter    TEXT,
  year       INTEGER,
  synced_at  TEXT
);

CREATE TABLE IF NOT EXISTS eventbrite_attendees (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id    TEXT,
  attendee_id TEXT UNIQUE,
  name        TEXT,
  email       TEXT,
  order_date  TEXT
);
