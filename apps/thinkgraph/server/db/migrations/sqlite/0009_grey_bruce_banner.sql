CREATE TABLE `thinkgraph_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`order` integer NOT NULL,
	`name` text NOT NULL,
	`appId` text,
	`repoUrl` text,
	`deployUrl` text,
	`status` text NOT NULL,
	`clientName` text,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `thinkgraph_workitems` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`parentId` text,
	`path` text NOT NULL,
	`depth` integer NOT NULL,
	`order` integer NOT NULL,
	`projectId` text NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`brief` text,
	`output` text,
	`assignee` text,
	`provider` text,
	`sessionId` text,
	`worktree` text,
	`deployUrl` text,
	`skill` text,
	`artifacts` text
);
--> statement-breakpoint
ALTER TABLE `team_settings` ADD `notion_settings` text;--> statement-breakpoint
ALTER TABLE `user` ADD `role` text DEFAULT 'user';