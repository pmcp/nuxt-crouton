-- Pi-side sync outbox (#176, epic #175 — D1 live mirror).
-- Records order / order-item / print-status mutations on the venue Pi so the
-- push loop (#177) can drain them to the cloud ingest endpoint (#178).
-- Local-only and additive; the till never reads it.
CREATE TABLE IF NOT EXISTS sales_sync_outbox (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL DEFAULT 'upsert',
  order_id TEXT,
  team_id TEXT,
  event_id TEXT,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  synced_at INTEGER
);

-- Drain query: pending rows (synced_at IS NULL), oldest first.
CREATE INDEX IF NOT EXISTS idx_sales_sync_outbox_pending ON sales_sync_outbox(synced_at, seq);
CREATE INDEX IF NOT EXISTS idx_sales_sync_outbox_entity ON sales_sync_outbox(entity_type, entity_id);
