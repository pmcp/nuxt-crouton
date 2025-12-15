-- Store Yjs document states (for fast reload)
CREATE TABLE IF NOT EXISTS yjs_flow_states (
  flow_id TEXT PRIMARY KEY,
  collection_name TEXT NOT NULL,
  state BLOB NOT NULL,
  version INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_yjs_flow_states_updated
  ON yjs_flow_states(updated_at);
