-- Add `content` column to thinkgraph_nodes
-- Stores TipTap JSON document for the Notion-style block editor in the slideover.
-- See docs/projects/thinkgraph-v2/notion-slideover-brief.md (PR 1).
ALTER TABLE `thinkgraph_nodes` ADD COLUMN `content` text;
