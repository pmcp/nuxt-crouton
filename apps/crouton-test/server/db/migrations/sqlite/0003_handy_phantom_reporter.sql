CREATE TABLE `team_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`translations` text,
	`ai_settings` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_settings_team_id_unique` ON `team_settings` (`team_id`);