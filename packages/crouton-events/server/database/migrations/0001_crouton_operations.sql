CREATE TABLE IF NOT EXISTS `crouton_operations` (
  `id` text PRIMARY KEY NOT NULL,
  `timestamp` integer NOT NULL,
  `type` text NOT NULL,
  `source` text NOT NULL,
  `team_id` text,
  `user_id` text,
  `metadata` text
);
