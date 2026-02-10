CREATE TABLE `team_settings` (
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
CREATE UNIQUE INDEX `team_settings_team_id_unique` ON `team_settings` (`team_id`);--> statement-breakpoint
CREATE INDEX `team_settings_team_idx` ON `team_settings` (`team_id`);--> statement-breakpoint
ALTER TABLE `bookings_locations` ADD `openDays` text;--> statement-breakpoint
ALTER TABLE `bookings_locations` ADD `slotSchedule` text;--> statement-breakpoint
ALTER TABLE `bookings_locations` ADD `blockedDates` text;--> statement-breakpoint
ALTER TABLE `pages_pages` DROP COLUMN `parentId`;--> statement-breakpoint
ALTER TABLE `pages_pages` DROP COLUMN `path`;--> statement-breakpoint
ALTER TABLE `pages_pages` DROP COLUMN `depth`;