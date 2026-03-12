ALTER TABLE `content_articles` ADD `slug` text NOT NULL DEFAULT '';
-- Backfill slugs from existing IDs (production uses human-readable IDs as URLs)
UPDATE `content_articles` SET `slug` = `id` WHERE `slug` = '';