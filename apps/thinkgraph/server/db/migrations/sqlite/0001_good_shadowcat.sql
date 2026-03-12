CREATE TABLE `thinkgraph_chatconversations` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`order` integer NOT NULL,
	`nodeId` text,
	`title` text,
	`messages` text NOT NULL,
	`provider` text,
	`model` text,
	`systemPrompt` text,
	`metadata` text,
	`messageCount` integer,
	`lastMessageAt` integer
);
--> statement-breakpoint
ALTER TABLE `thinkgraph_decisions` DROP COLUMN `createdAt`;--> statement-breakpoint
ALTER TABLE `thinkgraph_decisions` DROP COLUMN `updatedAt`;--> statement-breakpoint
ALTER TABLE `thinkgraph_decisions` DROP COLUMN `createdBy`;--> statement-breakpoint
ALTER TABLE `thinkgraph_decisions` DROP COLUMN `updatedBy`;