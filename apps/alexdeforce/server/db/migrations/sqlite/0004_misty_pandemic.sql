PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_content_agendas` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`order` integer NOT NULL,
	`title` text NOT NULL,
	`date` integer NOT NULL,
	`content` text,
	`thumbnail` text,
	`status` text NOT NULL,
	`publishedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_content_agendas`("id", "teamId", "owner", "order", "title", "date", "content", "thumbnail", "status", "publishedAt", "createdAt", "updatedAt", "createdBy", "updatedBy") SELECT "id", "teamId", "owner", "order", "title", "date", "content", "thumbnail", "status", "publishedAt", "createdAt", "updatedAt", "createdBy", "updatedBy" FROM `content_agendas`;--> statement-breakpoint
DROP TABLE `content_agendas`;--> statement-breakpoint
ALTER TABLE `__new_content_agendas` RENAME TO `content_agendas`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_content_articles` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`order` integer NOT NULL,
	`title` text NOT NULL,
	`date` integer NOT NULL,
	`category` text NOT NULL,
	`content` text,
	`embed` text,
	`imageUrl` text,
	`tags` text,
	`featured` integer,
	`status` text NOT NULL,
	`publishedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_content_articles`("id", "teamId", "owner", "order", "title", "date", "category", "content", "embed", "imageUrl", "tags", "featured", "status", "publishedAt", "createdAt", "updatedAt", "createdBy", "updatedBy") SELECT "id", "teamId", "owner", "order", "title", "date", "category", "content", "embed", "imageUrl", "tags", "featured", "status", "publishedAt", "createdAt", "updatedAt", "createdBy", "updatedBy" FROM `content_articles`;--> statement-breakpoint
DROP TABLE `content_articles`;--> statement-breakpoint
ALTER TABLE `__new_content_articles` RENAME TO `content_articles`;