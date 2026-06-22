-- Package-owned migration: @fyit/crouton-i18n ships its own translations_ui table.
--
-- crouton-core transitively extends @fyit/crouton-i18n, so every app queries
-- translations_ui on every admin load. NuxtHub auto-applies this file because
-- @nuxthub/core scans every layer's server/db/migrations dir
-- (@nuxthub/core/dist/module.mjs:177) and tracks applied migrations by filename
-- in _hub_migrations.
--
-- Idempotent (IF NOT EXISTS): no-ops in the ~19 apps that already created the
-- table via their own per-app migration, and creates it on fresh/no-i18n apps.
-- The column/index shape matches crouton-i18n's drizzle schema
-- (server/database/schema.ts) exactly — copied verbatim from an app's already
-- generated translations_ui migration (apps/fanfare 0000, apps/velo 0000).
CREATE TABLE IF NOT EXISTS `translations_ui` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`team_id` text,
	`namespace` text DEFAULT 'ui' NOT NULL,
	`key_path` text NOT NULL,
	`category` text NOT NULL,
	`values` text NOT NULL,
	`description` text,
	`is_overrideable` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `translations_ui_team_id_namespace_key_path_unique` ON `translations_ui` (`team_id`,`namespace`,`key_path`);
