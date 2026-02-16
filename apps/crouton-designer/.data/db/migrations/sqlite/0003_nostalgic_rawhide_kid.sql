CREATE TABLE `designer_fields` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`order` integer NOT NULL,
	`collectionId` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`meta` text,
	`refTarget` text,
	`sortOrder` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
