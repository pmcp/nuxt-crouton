CREATE TABLE `sales_sync_status` (
	`id` text PRIMARY KEY NOT NULL,
	`last_contact_at` integer,
	`last_event_at` integer,
	`last_batch_applied` integer NOT NULL,
	`updated_at` integer NOT NULL
);
