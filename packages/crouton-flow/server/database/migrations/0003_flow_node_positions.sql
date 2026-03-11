-- Add node_positions column to flow_configs
-- Stores node positions as JSON, decoupled from collection schemas
ALTER TABLE flow_configs ADD COLUMN node_positions TEXT;
