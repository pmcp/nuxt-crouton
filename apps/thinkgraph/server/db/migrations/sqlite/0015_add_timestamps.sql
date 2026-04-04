-- Add createdAt and updatedAt timestamps to thinkgraph_nodes
ALTER TABLE `thinkgraph_nodes` ADD COLUMN `createdAt` text;
ALTER TABLE `thinkgraph_nodes` ADD COLUMN `updatedAt` text;
