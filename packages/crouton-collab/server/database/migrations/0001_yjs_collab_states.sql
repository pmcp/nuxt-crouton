-- Generic table for storing Yjs state for any room type
-- Supports multiple room types: 'page', 'flow', 'document', etc.
CREATE TABLE IF NOT EXISTS yjs_collab_states (
  room_type TEXT NOT NULL,           -- 'page', 'flow', 'document', etc.
  room_id TEXT NOT NULL,             -- The entity ID
  state BLOB NOT NULL,               -- Yjs binary state
  version INTEGER DEFAULT 1,         -- For optimistic concurrency
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (room_type, room_id)
);

-- Index for querying by updated time (useful for Phase 6 "who's editing")
CREATE INDEX IF NOT EXISTS idx_yjs_collab_states_updated
  ON yjs_collab_states(updated_at);

-- Index for querying all rooms of a specific type
CREATE INDEX IF NOT EXISTS idx_yjs_collab_states_type
  ON yjs_collab_states(room_type);
