-- Cloud-side sync heartbeat (#179, epic #175 — D1 live mirror).
-- Single global row written by the cloud ingest endpoint (#178) on every call
-- (real batch OR the pusher's idle ping) so the online dashboard can show
-- "last synced Xs ago" and detect an offline Pi. Cloud-only; the till never
-- writes here.
CREATE TABLE IF NOT EXISTS sales_sync_status (
  id TEXT PRIMARY KEY,
  last_contact_at INTEGER,
  last_event_at INTEGER,
  last_batch_applied INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
