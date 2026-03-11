CREATE TABLE `crouton_redirects` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`fromPath` text NOT NULL,
	`toPath` text NOT NULL,
	`statusCode` text DEFAULT '301' NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crouton_redirects_team_from_path_idx` ON `crouton_redirects` (`teamId`,`fromPath`);
