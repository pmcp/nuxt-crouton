PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_blog_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`body` text,
	`author` text,
	`publishedAt` integer,
	`status` text NOT NULL,
	`tags` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_blog_posts`("id", "teamId", "owner", "title", "slug", "body", "author", "publishedAt", "status", "tags", "createdAt", "updatedAt", "createdBy", "updatedBy") SELECT "id", "teamId", "owner", "title", "slug", "body", "author", "publishedAt", "status", "tags", "createdAt", "updatedAt", "createdBy", "updatedBy" FROM `blog_posts`;--> statement-breakpoint
DROP TABLE `blog_posts`;--> statement-breakpoint
ALTER TABLE `__new_blog_posts` RENAME TO `blog_posts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `blog_posts_team_slug_idx` ON `blog_posts` (`teamId`,`slug`);