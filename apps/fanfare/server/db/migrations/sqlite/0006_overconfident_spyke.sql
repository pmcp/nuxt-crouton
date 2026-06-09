PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sales_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`eventId` text NOT NULL,
	`title` text NOT NULL,
	`displayOrder` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_sales_categories`("id", "teamId", "owner", "eventId", "title", "displayOrder", "createdAt", "updatedAt", "createdBy", "updatedBy") SELECT "id", "teamId", "owner", "eventId", "title", "displayOrder", "createdAt", "updatedAt", "createdBy", "updatedBy" FROM `sales_categories`;--> statement-breakpoint
DROP TABLE `sales_categories`;--> statement-breakpoint
ALTER TABLE `__new_sales_categories` RENAME TO `sales_categories`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_sales_orderitems` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`orderId` text NOT NULL,
	`productId` text NOT NULL,
	`quantity` integer NOT NULL,
	`unitPrice` real NOT NULL,
	`totalPrice` real NOT NULL,
	`remarks` text,
	`selectedOptions` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_sales_orderitems`("id", "teamId", "owner", "orderId", "productId", "quantity", "unitPrice", "totalPrice", "remarks", "selectedOptions", "createdAt", "updatedAt", "createdBy", "updatedBy") SELECT "id", "teamId", "owner", "orderId", "productId", "quantity", "unitPrice", "totalPrice", "remarks", "selectedOptions", "createdAt", "updatedAt", "createdBy", "updatedBy" FROM `sales_orderitems`;--> statement-breakpoint
DROP TABLE `sales_orderitems`;--> statement-breakpoint
ALTER TABLE `__new_sales_orderitems` RENAME TO `sales_orderitems`;--> statement-breakpoint
CREATE TABLE `__new_sales_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`eventId` text NOT NULL,
	`clientId` text,
	`clientName` text,
	`eventOrderNumber` integer,
	`overallRemarks` text,
	`isPersonnel` integer,
	`status` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_sales_orders`("id", "teamId", "owner", "eventId", "clientId", "clientName", "eventOrderNumber", "overallRemarks", "isPersonnel", "status", "createdAt", "updatedAt", "createdBy", "updatedBy") SELECT "id", "teamId", "owner", "eventId", "clientId", "clientName", "eventOrderNumber", "overallRemarks", "isPersonnel", "status", "createdAt", "updatedAt", "createdBy", "updatedBy" FROM `sales_orders`;--> statement-breakpoint
DROP TABLE `sales_orders`;--> statement-breakpoint
ALTER TABLE `__new_sales_orders` RENAME TO `sales_orders`;--> statement-breakpoint
ALTER TABLE `sales_clients` DROP COLUMN `order`;--> statement-breakpoint
ALTER TABLE `sales_events` DROP COLUMN `order`;--> statement-breakpoint
ALTER TABLE `sales_eventsettings` DROP COLUMN `order`;--> statement-breakpoint
ALTER TABLE `sales_locations` DROP COLUMN `order`;--> statement-breakpoint
ALTER TABLE `sales_printers` DROP COLUMN `order`;--> statement-breakpoint
ALTER TABLE `sales_printqueues` DROP COLUMN `order`;