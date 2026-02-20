-- Flow configurations table
-- Stores saved flow visualizations per team
CREATE TABLE IF NOT EXISTS flow_configs (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  collection TEXT NOT NULL,
  label_field TEXT DEFAULT 'title',
  parent_field TEXT DEFAULT 'parentId',
  position_field TEXT DEFAULT 'position',
  sync_enabled INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_flow_configs_team_id ON flow_configs(team_id);
