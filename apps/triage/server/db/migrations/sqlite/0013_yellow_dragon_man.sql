CREATE TABLE IF NOT EXISTS `categorize_categorize_layouts` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`order` integer NOT NULL,
	`name` text,
	`databaseId` text NOT NULL,
	`accountId` text NOT NULL,
	`categoryProperty` text NOT NULL,
	`layout` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
DROP INDEX IF EXISTS `triage_tasks_notionPageId_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `triage_tasks_team_notion_page_id_idx` ON `triage_tasks` (`teamId`,`notionPageId`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pages_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`parentId` text,
	`path` text NOT NULL,
	`depth` integer NOT NULL,
	`order` integer NOT NULL,
	`title` text,
	`slug` text,
	`pageType` text NOT NULL,
	`content` text,
	`config` text,
	`status` text NOT NULL,
	`visibility` text NOT NULL,
	`publishedAt` integer,
	`showInNavigation` integer,
	`layout` text,
	`seoTitle` text,
	`seoDescription` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_pages_pages`("id", "teamId", "owner", "parentId", "path", "depth", "order", "title", "slug", "pageType", "content", "config", "status", "visibility", "publishedAt", "showInNavigation", "layout", "seoTitle", "seoDescription", "createdAt", "updatedAt", "createdBy", "updatedBy") SELECT "id", "teamId", "owner", "parentId", "path", "depth", "order", "title", "slug", "pageType", "content", "config", "status", "visibility", "publishedAt", "showInNavigation", "layout", "seoTitle", "seoDescription", "createdAt", "updatedAt", "createdBy", "updatedBy" FROM `pages_pages`;--> statement-breakpoint
DROP TABLE `pages_pages`;--> statement-breakpoint
ALTER TABLE `__new_pages_pages` RENAME TO `pages_pages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `pages_pages_team_slug_idx` ON `pages_pages` (`teamId`,`slug`);--> statement-breakpoint
ALTER TABLE `triage_inputs` ADD `name` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `triage_inputs` DROP COLUMN `accountId`;--> statement-breakpoint
ALTER TABLE `triage_outputs` ADD `name` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `triage_outputs` DROP COLUMN `accountId`;