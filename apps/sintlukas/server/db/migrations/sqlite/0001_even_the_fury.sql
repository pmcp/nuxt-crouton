CREATE TABLE `auth_email_log` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text,
	`emailType` text NOT NULL,
	`recipientEmail` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`error` text,
	`sentAt` integer,
	`metadata` text,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_email_log_org_idx` ON `auth_email_log` (`organizationId`);--> statement-breakpoint
CREATE INDEX `auth_email_log_type_idx` ON `auth_email_log` (`emailType`);--> statement-breakpoint
CREATE INDEX `auth_email_log_status_idx` ON `auth_email_log` (`status`);--> statement-breakpoint
CREATE INDEX `auth_email_log_recipient_idx` ON `auth_email_log` (`recipientEmail`);--> statement-breakpoint
CREATE INDEX `auth_email_log_created_idx` ON `auth_email_log` (`createdAt`);--> statement-breakpoint
CREATE TABLE `crouton_redirects` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`fromPath` text NOT NULL,
	`toPath` text NOT NULL,
	`statusCode` text NOT NULL,
	`isActive` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crouton_redirects_team_from_path_idx` ON `crouton_redirects` (`teamId`,`fromPath`);