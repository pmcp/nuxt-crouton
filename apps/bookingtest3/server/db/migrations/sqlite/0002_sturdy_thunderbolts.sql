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
