ALTER TABLE `pages_pages` ADD `parentId` text;--> statement-breakpoint
ALTER TABLE `pages_pages` ADD `path` text NOT NULL;--> statement-breakpoint
ALTER TABLE `pages_pages` ADD `depth` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `pages_pages` ADD `title` text NOT NULL;--> statement-breakpoint
ALTER TABLE `pages_pages` ADD `slug` text NOT NULL;--> statement-breakpoint
ALTER TABLE `pages_pages` ADD `pageType` text NOT NULL;--> statement-breakpoint
ALTER TABLE `pages_pages` ADD `content` text;--> statement-breakpoint
ALTER TABLE `pages_pages` ADD `config` text;--> statement-breakpoint
ALTER TABLE `pages_pages` ADD `status` text NOT NULL;--> statement-breakpoint
ALTER TABLE `pages_pages` ADD `visibility` text NOT NULL;--> statement-breakpoint
ALTER TABLE `pages_pages` ADD `publishedAt` integer;--> statement-breakpoint
ALTER TABLE `pages_pages` ADD `showInNavigation` integer;--> statement-breakpoint
ALTER TABLE `pages_pages` ADD `seoTitle` text;--> statement-breakpoint
ALTER TABLE `pages_pages` ADD `seoDescription` text;--> statement-breakpoint
ALTER TABLE `pages_pages` ADD `translations` text;--> statement-breakpoint
CREATE UNIQUE INDEX `pages_pages_slug_unique` ON `pages_pages` (`slug`);--> statement-breakpoint
ALTER TABLE `pages_pages` DROP COLUMN `name`;--> statement-breakpoint
ALTER TABLE `pages_pages` DROP COLUMN `label`;--> statement-breakpoint
ALTER TABLE `pages_pages` DROP COLUMN `icon`;--> statement-breakpoint
ALTER TABLE `pages_pages` DROP COLUMN `description`;--> statement-breakpoint
ALTER TABLE `pages_pages` DROP COLUMN `hierarchy`;--> statement-breakpoint
ALTER TABLE `pages_pages` DROP COLUMN `fields`;