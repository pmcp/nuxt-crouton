CREATE TABLE `thinkgraph_canvases` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`order` integer NOT NULL,
	`title` text NOT NULL,
	`epicId` text,
	`epicBrief` text,
	`status` text
);
--> statement-breakpoint
CREATE TABLE `thinkgraph_injectrequests` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`order` integer NOT NULL,
	`nodeId` text NOT NULL,
	`fromUserId` text,
	`content` text NOT NULL,
	`status` text
);
--> statement-breakpoint
CREATE TABLE `thinkgraph_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`parentId` text,
	`path` text NOT NULL,
	`depth` integer NOT NULL,
	`order` integer NOT NULL,
	`canvasId` text NOT NULL,
	`nodeType` text NOT NULL,
	`status` text NOT NULL,
	`title` text NOT NULL,
	`brief` text,
	`output` text,
	`handoffType` text,
	`handoffMeta` text,
	`contextScope` text,
	`contextNodeIds` text,
	`notionTaskId` text,
	`worktree` text,
	`sendTarget` text,
	`sendMode` text,
	`injectMode` text,
	`origin` text,
	`stepIndex` text,
	`skillVersion` text,
	`tokenCount` text,
	`userId` text
);
