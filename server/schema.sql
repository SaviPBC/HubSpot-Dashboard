CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
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
  synced_at              TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at    TEXT NOT NULL,
  completed_at  TEXT,
  status        TEXT NOT NULL DEFAULT 'running',
  deals_fetched INTEGER DEFAULT 0,
  error         TEXT
);
