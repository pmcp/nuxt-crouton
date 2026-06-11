CREATE TABLE `scopedAccessGrant` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`resourceType` text NOT NULL,
	`resourceId` text NOT NULL,
	`role` text DEFAULT 'guest' NOT NULL,
	`credentialType` text DEFAULT 'pin' NOT NULL,
	`secretHash` text NOT NULL,
	`maxUses` integer,
	`usedCount` integer DEFAULT 0 NOT NULL,
	`failedAttempts` integer DEFAULT 0 NOT NULL,
	`lockedUntil` integer,
	`isActive` integer DEFAULT true NOT NULL,
	`expiresAt` integer,
	`tokenTtl` integer DEFAULT 28800000 NOT NULL,
	`metadata` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `scoped_grant_resource_idx` ON `scopedAccessGrant` (`resourceType`,`resourceId`);--> statement-breakpoint
CREATE INDEX `scoped_grant_org_idx` ON `scopedAccessGrant` (`organizationId`);--> statement-breakpoint
CREATE INDEX `scoped_grant_active_idx` ON `scopedAccessGrant` (`isActive`,`expiresAt`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sales_printers` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`eventId` text NOT NULL,
	`locationId` text,
	`title` text NOT NULL,
	`ipAddress` text NOT NULL,
	`port` text,
	`type` text,
	`status` text,
	`showPrices` integer,
	`isActive` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_sales_printers`("id", "teamId", "owner", "eventId", "locationId", "title", "ipAddress", "port", "type", "status", "showPrices", "isActive", "createdAt", "updatedAt", "createdBy", "updatedBy") SELECT "id", "teamId", "owner", "eventId", "locationId", "title", "ipAddress", "port", "type", "status", "showPrices", "isActive", "createdAt", "updatedAt", "createdBy", "updatedBy" FROM `sales_printers`;--> statement-breakpoint
DROP TABLE `sales_printers`;--> statement-breakpoint
ALTER TABLE `__new_sales_printers` RENAME TO `sales_printers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;