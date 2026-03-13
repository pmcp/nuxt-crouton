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
CREATE INDEX `auth_email_log_created_idx` ON `auth_email_log` (`createdAt`);