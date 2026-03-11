ALTER TABLE `content_articles` ADD `slug` text NOT NULL DEFAULT '';
-- Backfill slugs from titles: lowercase, replace spaces with hyphens
UPDATE `content_articles` SET `slug` = REPLACE(LOWER(`title`), ' ', '-') WHERE `slug` = '';