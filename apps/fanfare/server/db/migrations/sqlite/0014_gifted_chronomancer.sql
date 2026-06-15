CREATE TABLE `sales_sync_outbox` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`operation` text NOT NULL,
	`order_id` text,
	`team_id` text,
	`event_id` text,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	`synced_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_sales_sync_outbox_pending` ON `sales_sync_outbox` (`synced_at`,`seq`);--> statement-breakpoint
CREATE INDEX `idx_sales_sync_outbox_entity` ON `sales_sync_outbox` (`entity_type`,`entity_id`);