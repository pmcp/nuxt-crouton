-- Phase 0: Unify collections — merge decisions + workitems into nodes
-- Manual migration (drizzle-kit interactive prompts don't work in CI)

-- Step 1: Rename canvasId → projectId
ALTER TABLE `thinkgraph_nodes` RENAME COLUMN `canvasId` TO `projectId`;

-- Step 2: Rename nodeType → template
ALTER TABLE `thinkgraph_nodes` RENAME COLUMN `nodeType` TO `template`;

-- Step 3: Add new unified fields
ALTER TABLE `thinkgraph_nodes` ADD COLUMN `summary` text;
ALTER TABLE `thinkgraph_nodes` ADD COLUMN `steps` text;
ALTER TABLE `thinkgraph_nodes` ADD COLUMN `retrospective` text;
ALTER TABLE `thinkgraph_nodes` ADD COLUMN `assignee` text DEFAULT 'human';
ALTER TABLE `thinkgraph_nodes` ADD COLUMN `provider` text;
ALTER TABLE `thinkgraph_nodes` ADD COLUMN `skill` text;
ALTER TABLE `thinkgraph_nodes` ADD COLUMN `sessionId` text;
ALTER TABLE `thinkgraph_nodes` ADD COLUMN `stage` text;
ALTER TABLE `thinkgraph_nodes` ADD COLUMN `signal` text;
ALTER TABLE `thinkgraph_nodes` ADD COLUMN `starred` integer DEFAULT 0;
ALTER TABLE `thinkgraph_nodes` ADD COLUMN `pinned` integer DEFAULT 0;
ALTER TABLE `thinkgraph_nodes` ADD COLUMN `deployUrl` text;
ALTER TABLE `thinkgraph_nodes` ADD COLUMN `artifacts` text;

-- Step 4: Drop legacy columns (SQLite doesn't support DROP COLUMN before 3.35.0,
-- but NuxtHub local dev uses libsql which supports it)
ALTER TABLE `thinkgraph_nodes` DROP COLUMN `handoffType`;
ALTER TABLE `thinkgraph_nodes` DROP COLUMN `handoffMeta`;
ALTER TABLE `thinkgraph_nodes` DROP COLUMN `contextNodeIds`;
ALTER TABLE `thinkgraph_nodes` DROP COLUMN `notionTaskId`;
ALTER TABLE `thinkgraph_nodes` DROP COLUMN `sendTarget`;
ALTER TABLE `thinkgraph_nodes` DROP COLUMN `sendMode`;
ALTER TABLE `thinkgraph_nodes` DROP COLUMN `injectMode`;
ALTER TABLE `thinkgraph_nodes` DROP COLUMN `stepIndex`;
ALTER TABLE `thinkgraph_nodes` DROP COLUMN `skillVersion`;
ALTER TABLE `thinkgraph_nodes` DROP COLUMN `tokenCount`;
ALTER TABLE `thinkgraph_nodes` DROP COLUMN `userId`;

-- Step 5: Migrate workitems data into nodes table
INSERT INTO `thinkgraph_nodes` (
  `id`, `teamId`, `owner`, `parentId`, `path`, `depth`, `order`,
  `projectId`, `template`, `status`, `title`, `brief`, `output`,
  `retrospective`, `assignee`, `provider`, `skill`, `sessionId`,
  `stage`, `signal`, `worktree`, `deployUrl`, `artifacts`,
  `origin`, `contextScope`, `steps`
)
SELECT
  `id`, `teamId`, `owner`, `parentId`, `path`, `depth`, `order`,
  `projectId`,
  CASE `type`
    WHEN 'discover' THEN 'research'
    WHEN 'architect' THEN 'task'
    WHEN 'generate' THEN 'task'
    WHEN 'compose' THEN 'task'
    WHEN 'review' THEN 'research'
    WHEN 'deploy' THEN 'feature'
    ELSE 'task'
  END,
  `status`, `title`, `brief`, `output`,
  `retrospective`, `assignee`, `provider`, `skill`, `sessionId`,
  `stage`, `signal`, `worktree`, `deployUrl`, `artifacts`,
  'human', 'branch',
  CASE `type`
    WHEN 'discover' THEN '["analyse"]'
    WHEN 'review' THEN '["analyse"]'
    ELSE '["analyst","builder","reviewer","merger"]'
  END
FROM `thinkgraph_workitems`;
