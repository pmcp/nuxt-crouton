PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sales_products` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`order` integer NOT NULL,
	`eventId` text NOT NULL,
	`categoryId` text,
	`locationId` text,
	`title` text NOT NULL,
	`description` text,
	`price` real NOT NULL,
	`isActive` integer,
	`requiresRemark` integer,
	`remarkPrompt` text,
	`hasOptions` integer,
	`multipleOptionsAllowed` integer,
	`options` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_sales_products`("id", "teamId", "owner", "order", "eventId", "categoryId", "locationId", "title", "description", "price", "isActive", "requiresRemark", "remarkPrompt", "hasOptions", "multipleOptionsAllowed", "options", "createdAt", "updatedAt", "createdBy", "updatedBy") SELECT "id", "teamId", "owner", COALESCE("sortOrder", 0), "eventId", "categoryId", "locationId", "title", "description", "price", "isActive", "requiresRemark", "remarkPrompt", "hasOptions", "multipleOptionsAllowed", "options", "createdAt", "updatedAt", "createdBy", "updatedBy" FROM `sales_products`;--> statement-breakpoint
DROP TABLE `sales_products`;--> statement-breakpoint
ALTER TABLE `__new_sales_products` RENAME TO `sales_products`;--> statement-breakpoint
PRAGMA foreign_keys=ON;