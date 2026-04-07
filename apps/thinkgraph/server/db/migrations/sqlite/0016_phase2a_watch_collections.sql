-- Phase 2A: watchedrepos + watchreports collections
-- Manual migration (drizzle-kit snapshot drift; see docs/projects/thinkgraph-v2/implementation-notes.md)

CREATE TABLE `thinkgraph_watchedrepos` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`order` integer NOT NULL,
	`repo` text NOT NULL,
	`branch` text,
	`lastCheckedSha` text,
	`notes` text,
	`active` integer
);
--> statement-breakpoint
CREATE TABLE `thinkgraph_watchreports` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`owner` text NOT NULL,
	`order` integer NOT NULL,
	`repoId` text NOT NULL,
	`runDate` text NOT NULL,
	`summary` text,
	`commitsSinceLast` text,
	`createdNodeIds` text
);