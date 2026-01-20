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
CREATE UNIQUE INDEX `pages_pages_slug_unique` ON `pages_pages` (`slug`);