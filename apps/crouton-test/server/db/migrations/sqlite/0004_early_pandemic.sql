PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_team_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`translations` text,
	`ai_settings` text,
	`theme_settings` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`team_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_team_settings`("id", "team_id", "translations", "ai_settings", "created_at", "updated_at") SELECT "id", "team_id", "translations", "ai_settings", "created_at", "updated_at" FROM `team_settings`;--> statement-breakpoint
DROP TABLE `team_settings`;--> statement-breakpoint
ALTER TABLE `__new_team_settings` RENAME TO `team_settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `team_settings_team_id_unique` ON `team_settings` (`team_id`);--> statement-breakpoint
CREATE INDEX `team_settings_team_idx` ON `team_settings` (`team_id`);