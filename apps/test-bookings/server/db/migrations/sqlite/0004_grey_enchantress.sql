CREATE TABLE `bookings_emaillogs` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`order` integer NOT NULL,
	`bookingId` text,
	`templateId` text,
	`recipientEmail` text NOT NULL,
	`triggerType` text NOT NULL,
	`status` text NOT NULL,
	`sentAt` text,
	`error` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bookings_emailtemplates` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`order` integer NOT NULL,
	`name` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`fromEmail` text NOT NULL,
	`triggerType` text NOT NULL,
	`recipientType` text NOT NULL,
	`isActive` integer,
	`daysOffset` integer,
	`locationId` text,
	`translations` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `translations_ui` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`team_id` text,
	`namespace` text DEFAULT 'ui' NOT NULL,
	`key_path` text NOT NULL,
	`category` text NOT NULL,
	`values` text NOT NULL,
	`description` text,
	`is_overrideable` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `translations_ui_team_id_namespace_key_path_unique` ON `translations_ui` (`team_id`,`namespace`,`key_path`);--> statement-breakpoint
ALTER TABLE `bookings_locations` DROP COLUMN `color`;