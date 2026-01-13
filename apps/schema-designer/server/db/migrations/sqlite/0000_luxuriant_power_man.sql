CREATE TABLE `schema_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`base_layer_name` text,
	`layer_name` text NOT NULL,
	`collection_name` text NOT NULL,
	`schema` text NOT NULL,
	`options` text NOT NULL,
	`packages` text,
	`collections` text,
	`team_id` text,
	`user_id` text,
	`created_at` integer,
	`updated_at` integer
);
