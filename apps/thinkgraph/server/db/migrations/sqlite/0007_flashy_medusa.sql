PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_thinkgraph_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`order` integer NOT NULL,
	`graphId` text NOT NULL,
	`content` text NOT NULL,
	`nodeType` text NOT NULL,
	`pathType` text,
	`starred` integer,
	`pinned` integer,
	`branchName` text,
	`versionTag` text,
	`parentId` text,
	`source` text,
	`model` text,
	`artifacts` text,
	`status` text,
	`origin` text,
	`notionId` text,
	`notionUrl` text,
	`worktreeRef` text,
	`sessionId` text,
	`brief` text,
	`contextScope` text,
	`approvedAt` text,
	`approvedBy` text
);
--> statement-breakpoint
INSERT INTO `__new_thinkgraph_decisions`("id", "teamId", "owner", "order", "graphId", "content", "nodeType", "pathType", "starred", "pinned", "branchName", "versionTag", "parentId", "source", "model", "artifacts", "status", "origin", "notionId", "notionUrl", "worktreeRef", "sessionId", "brief", "contextScope", "approvedAt", "approvedBy") SELECT "id", "teamId", "owner", "order", "graphId", "content", "nodeType", "pathType", "starred", "pinned", "branchName", "versionTag", "parentId", "source", "model", "artifacts", "status", "origin", "notionId", "notionUrl", "worktreeRef", "sessionId", "brief", "contextScope", "approvedAt", "approvedBy" FROM `thinkgraph_decisions`;--> statement-breakpoint
DROP TABLE `thinkgraph_decisions`;--> statement-breakpoint
ALTER TABLE `__new_thinkgraph_decisions` RENAME TO `thinkgraph_decisions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `team_settings` ADD `email_settings` text;