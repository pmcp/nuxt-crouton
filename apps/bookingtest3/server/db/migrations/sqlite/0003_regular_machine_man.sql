DROP INDEX `pages_pages_slug_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `pages_pages_team_slug_idx` ON `pages_pages` (`teamId`,`slug`);