-- Phase 3: Re-add contextNodeIds for fan-in connections
-- Previously dropped in Phase 0 (unified nodes), now needed for synthesis/fan-in
ALTER TABLE `thinkgraph_nodes` ADD COLUMN `contextNodeIds` text DEFAULT '[]';
