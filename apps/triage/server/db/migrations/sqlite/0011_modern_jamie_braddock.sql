CREATE TABLE `user_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`locale` text,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_profile_userId_unique` ON `user_profile` (`userId`);--> statement-breakpoint
CREATE INDEX `user_profile_user_idx` ON `user_profile` (`userId`);--> statement-breakpoint
ALTER TABLE `team_settings` ADD `site_settings` text;