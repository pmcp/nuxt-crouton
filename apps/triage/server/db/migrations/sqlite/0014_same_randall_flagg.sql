CREATE TABLE `flow_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`collection` text NOT NULL,
	`label_field` text DEFAULT 'title',
	`parent_field` text DEFAULT 'parentId',
	`position_field` text DEFAULT 'position',
	`sync_enabled` integer DEFAULT false,
	`node_positions` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_flow_configs_team_id` ON `flow_configs` (`team_id`);