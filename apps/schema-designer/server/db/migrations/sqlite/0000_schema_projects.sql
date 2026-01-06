CREATE TABLE `schema_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`layer_name` text NOT NULL,
	`collection_name` text NOT NULL,
	`schema` text NOT NULL,
	`options` text NOT NULL,
	`collections` text,
	`team_id` text,
	`user_id` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
