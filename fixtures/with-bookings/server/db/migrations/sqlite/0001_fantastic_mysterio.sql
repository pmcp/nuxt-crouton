CREATE TABLE `translations_ui` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`team_id` text,
	`namespace` text DEFAULT 'ui' NOT NULL,
	`key_path` text NOT NULL,
	`category` text NOT NULL,
	`values` text NOT NULL,
	`description` text,
	`is_overrideable` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `translations_ui_team_id_namespace_key_path_unique` ON `translations_ui` (`team_id`,`namespace`,`key_path`);