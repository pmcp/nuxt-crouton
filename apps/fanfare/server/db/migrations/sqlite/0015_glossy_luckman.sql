PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sales_printers` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`eventId` text NOT NULL,
	`locationId` text NOT NULL,
	`title` text NOT NULL,
	`ipAddress` text NOT NULL,
	`port` text,
	`status` text,
	`showPrices` integer,
	`isActive` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_sales_printers`("id", "teamId", "owner", "eventId", "locationId", "title", "ipAddress", "port", "status", "showPrices", "isActive", "createdAt", "updatedAt", "createdBy", "updatedBy") SELECT "id", "teamId", "owner", "eventId", "locationId", "title", "ipAddress", "port", "status", "showPrices", "isActive", "createdAt", "updatedAt", "createdBy", "updatedBy" FROM `sales_printers`;--> statement-breakpoint
DROP TABLE `sales_printers`;--> statement-breakpoint
ALTER TABLE `__new_sales_printers` RENAME TO `sales_printers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_sales_printqueues` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`eventId` text NOT NULL,
	`orderId` text NOT NULL,
	`printerId` text NOT NULL,
	`locationId` text,
	`status` text NOT NULL,
	`printData` text NOT NULL,
	`printMode` text,
	`errorMessage` text,
	`retryCount` text,
	`completedAt` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_sales_printqueues`("id", "teamId", "owner", "eventId", "orderId", "printerId", "locationId", "status", "printData", "printMode", "errorMessage", "retryCount", "completedAt", "createdAt", "updatedAt", "createdBy", "updatedBy") SELECT "id", "teamId", "owner", "eventId", "orderId", "printerId", "locationId", "status", "printData", "printMode", "errorMessage", "retryCount", "completedAt", "createdAt", "updatedAt", "createdBy", "updatedBy" FROM `sales_printqueues`;--> statement-breakpoint
DROP TABLE `sales_printqueues`;--> statement-breakpoint
ALTER TABLE `__new_sales_printqueues` RENAME TO `sales_printqueues`;--> statement-breakpoint
ALTER TABLE `sales_clients` DROP COLUMN `isActive`;--> statement-breakpoint
ALTER TABLE `sales_events` DROP COLUMN `currency`;--> statement-breakpoint
ALTER TABLE `sales_orders` DROP COLUMN `locationRemarks`;