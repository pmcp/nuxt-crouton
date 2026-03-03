CREATE TABLE `pages_pages` (
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
CREATE UNIQUE INDEX `pages_pages_slug_unique` ON `pages_pages` (`slug`);