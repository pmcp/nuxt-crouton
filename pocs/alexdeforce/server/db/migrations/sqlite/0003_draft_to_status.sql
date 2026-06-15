-- Data migration: convert draft boolean to status string
-- Add new columns first
ALTER TABLE content_articles ADD COLUMN `status` text NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE content_articles ADD COLUMN `publishedAt` integer;--> statement-breakpoint
-- Migrate data: draft=1 → 'draft', draft=0/NULL → 'published'
UPDATE content_articles SET status = CASE WHEN draft = 1 THEN 'draft' ELSE 'published' END;--> statement-breakpoint
UPDATE content_articles SET publishedAt = createdAt WHERE draft = 0 OR draft IS NULL;--> statement-breakpoint
-- Same for agendas
ALTER TABLE content_agendas ADD COLUMN `status` text NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE content_agendas ADD COLUMN `publishedAt` integer;--> statement-breakpoint
UPDATE content_agendas SET status = CASE WHEN draft = 1 THEN 'draft' ELSE 'published' END;--> statement-breakpoint
UPDATE content_agendas SET publishedAt = createdAt WHERE draft = 0 OR draft IS NULL;
