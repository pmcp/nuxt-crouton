CREATE TABLE `thinkgraph_graphs` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`order` integer NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
ALTER TABLE `thinkgraph_decisions` ADD `graphId` text NOT NULL;--> statement-breakpoint
ALTER TABLE `thinkgraph_chatconversations` DROP COLUMN `createdAt`;--> statement-breakpoint
ALTER TABLE `thinkgraph_chatconversations` DROP COLUMN `updatedAt`;--> statement-breakpoint
ALTER TABLE `thinkgraph_chatconversations` DROP COLUMN `createdBy`;--> statement-breakpoint
ALTER TABLE `thinkgraph_chatconversations` DROP COLUMN `updatedBy`;