#!/usr/bin/env node
/**
 * Add crouton-events layer to a Nuxt project
 *
 * This script scaffolds the crouton-events collection layer which provides
 * audit trail/event tracking for all collection mutations.
 *
 * Usage: npx crouton add events
 *
 * What it creates:
 * - layers/crouton-events/nuxt.config.ts
 * - layers/crouton-events/types.ts
 * - layers/crouton-events/server/database/schema.ts
 * - layers/crouton-events/server/database/queries.ts
 * - layers/crouton-events/server/api/teams/[id]/crouton-collection-events/*.ts
 *
 * What it updates:
 * - nuxt.config.ts (adds layer to extends)
 * - server/database/schema/index.ts (adds schema export)
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';

const LAYER_NAME = 'crouton-events';
const LAYER_PATH = `layers/${LAYER_NAME}`;

// ============================================================================
// File Templates
// ============================================================================

const templates = {
  nuxtConfig: `export default defineNuxtConfig({
  $meta: {
    name: 'crouton-events',
  },
})
`,

  types: `export interface CroutonCollectionEvent {
  id: string
  teamId: string
  owner: string
  timestamp: Date
  operation: 'create' | 'update' | 'delete'
  collectionName: string
  itemId: string
  userId: string
  userName: string
  changes: Array<{ fieldName: string; oldValue: unknown; newValue: unknown }>
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
  optimisticId?: string
  optimisticAction?: 'create' | 'update' | 'delete'
}

export type NewCroutonCollectionEvent = Omit<CroutonCollectionEvent, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>
`,

  schema: `import { nanoid } from 'nanoid'
import { sqliteTable, text, integer, customType } from 'drizzle-orm/sqlite-core'

// Custom JSON column that handles NULL values gracefully during LEFT JOINs
const jsonColumn = customType<{ data: unknown; driverData: string }>({
  dataType() {
    return 'text'
  },
  fromDriver(value: unknown): unknown {
    if (value === null || value === undefined || value === '') {
      return null
    }
    return JSON.parse(value as string)
  },
  toDriver(value: unknown): string {
    return JSON.stringify(value)
  },
})

export const croutonCollectionEvents = sqliteTable('crouton_collection_events', {
  id: text('id').primaryKey().$default(() => nanoid()),

  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  operation: text('operation').notNull(), // 'create' | 'update' | 'delete'
  collectionName: text('collectionName').notNull(),
  itemId: text('itemId').notNull(),
  userId: text('userId').notNull(),
  userName: text('userName').notNull(),
  changes: jsonColumn('changes').notNull(), // Array of {fieldName, oldValue, newValue}
  metadata: jsonColumn('metadata'),

  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  createdBy: text('createdBy').notNull(),
  updatedBy: text('updatedBy').notNull(),
})
`,

  queries: `import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { CroutonCollectionEvent, NewCroutonCollectionEvent } from '../../types'
import { users } from '~~/server/database/schema'

export async function getAllCroutonCollectionEvents(teamId: string) {
  const db = useDB()

  const ownerUsers = alias(users, 'ownerUsers')
  const createdByUsers = alias(users, 'createdByUsers')
  const updatedByUsers = alias(users, 'updatedByUsers')

  // @ts-expect-error Complex select with joins requires type assertion
  const events = await db
    .select({
      ...tables.croutonCollectionEvents,
      ownerUser: {
        id: ownerUsers.id,
        name: ownerUsers.name,
        email: ownerUsers.email,
        avatarUrl: ownerUsers.avatarUrl,
      },
      createdByUser: {
        id: createdByUsers.id,
        name: createdByUsers.name,
        email: createdByUsers.email,
        avatarUrl: createdByUsers.avatarUrl,
      },
      updatedByUser: {
        id: updatedByUsers.id,
        name: updatedByUsers.name,
        email: updatedByUsers.email,
        avatarUrl: updatedByUsers.avatarUrl,
      },
    })
    .from(tables.croutonCollectionEvents)
    .leftJoin(ownerUsers, eq(tables.croutonCollectionEvents.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.croutonCollectionEvents.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.croutonCollectionEvents.updatedBy, updatedByUsers.id))
    .where(eq(tables.croutonCollectionEvents.teamId, teamId))
    .orderBy(desc(tables.croutonCollectionEvents.timestamp))

  return events
}

export async function getCroutonCollectionEventsByIds(teamId: string, eventIds: string[]) {
  const db = useDB()

  const ownerUsers = alias(users, 'ownerUsers')
  const createdByUsers = alias(users, 'createdByUsers')
  const updatedByUsers = alias(users, 'updatedByUsers')

  // @ts-expect-error Complex select with joins requires type assertion
  const events = await db
    .select({
      ...tables.croutonCollectionEvents,
      ownerUser: {
        id: ownerUsers.id,
        name: ownerUsers.name,
        email: ownerUsers.email,
        avatarUrl: ownerUsers.avatarUrl,
      },
      createdByUser: {
        id: createdByUsers.id,
        name: createdByUsers.name,
        email: createdByUsers.email,
        avatarUrl: createdByUsers.avatarUrl,
      },
      updatedByUser: {
        id: updatedByUsers.id,
        name: updatedByUsers.name,
        email: updatedByUsers.email,
        avatarUrl: updatedByUsers.avatarUrl,
      },
    })
    .from(tables.croutonCollectionEvents)
    .leftJoin(ownerUsers, eq(tables.croutonCollectionEvents.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.croutonCollectionEvents.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.croutonCollectionEvents.updatedBy, updatedByUsers.id))
    .where(
      and(
        eq(tables.croutonCollectionEvents.teamId, teamId),
        inArray(tables.croutonCollectionEvents.id, eventIds),
      ),
    )
    .orderBy(desc(tables.croutonCollectionEvents.timestamp))

  return events
}

export async function createCroutonCollectionEvent(data: NewCroutonCollectionEvent) {
  const db = useDB()

  const [event] = await db
    .insert(tables.croutonCollectionEvents)
    .values(data)
    .returning()

  return event
}

export async function updateCroutonCollectionEvent(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<CroutonCollectionEvent>,
) {
  const db = useDB()

  const [event] = await db
    .update(tables.croutonCollectionEvents)
    .set({
      ...updates,
      updatedBy: ownerId,
    })
    .where(
      and(
        eq(tables.croutonCollectionEvents.id, recordId),
        eq(tables.croutonCollectionEvents.teamId, teamId),
        eq(tables.croutonCollectionEvents.owner, ownerId),
      ),
    )
    .returning()

  if (!event) {
    throw createError({
      statusCode: 404,
      statusMessage: 'CroutonCollectionEvent not found or unauthorized',
    })
  }

  return event
}

export async function deleteCroutonCollectionEvent(
  recordId: string,
  teamId: string,
  ownerId: string,
) {
  const db = useDB()

  const [deleted] = await db
    .delete(tables.croutonCollectionEvents)
    .where(
      and(
        eq(tables.croutonCollectionEvents.id, recordId),
        eq(tables.croutonCollectionEvents.teamId, teamId),
        eq(tables.croutonCollectionEvents.owner, ownerId),
      ),
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'CroutonCollectionEvent not found or unauthorized',
    })
  }

  return { success: true }
}
`,

  apiGet: `// Team-based endpoint - requires @crouton/auth package
import { getAllCroutonCollectionEvents, getCroutonCollectionEventsByIds } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team-auth'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)

  const query = getQuery(event)
  if (query.ids) {
    const ids = String(query.ids).split(',')
    return await getCroutonCollectionEventsByIds(team.id, ids)
  }

  return await getAllCroutonCollectionEvents(team.id)
})
`,

  apiPost: `// Team-based endpoint - requires @crouton/auth package
import { createCroutonCollectionEvent } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team-auth'

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody(event)

  // Exclude id field to let the database generate it
  const { id, ...dataWithoutId } = body

  // Convert date string to Date object
  if (dataWithoutId.timestamp) {
    dataWithoutId.timestamp = new Date(dataWithoutId.timestamp)
  }

  return await createCroutonCollectionEvent({
    ...dataWithoutId,
    teamId: team.id,
    owner: user.id,
    createdBy: user.id,
    updatedBy: user.id,
  })
})
`,

  apiPatch: `// Team-based endpoint - requires @crouton/auth package
import { updateCroutonCollectionEvent } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team-auth'

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const eventId = getRouterParam(event, 'eventId')
  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Event ID is required',
    })
  }

  const body = await readBody(event)

  return await updateCroutonCollectionEvent(eventId, team.id, user.id, body)
})
`,

  apiDelete: `// Team-based endpoint - requires @crouton/auth package
import { deleteCroutonCollectionEvent } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team-auth'

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const eventId = getRouterParam(event, 'eventId')
  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Event ID is required',
    })
  }

  return await deleteCroutonCollectionEvent(eventId, team.id, user.id)
})
`,
};

// ============================================================================
// File Generation
// ============================================================================

async function createLayerFiles(basePath) {
  const files = [
    { path: 'nuxt.config.ts', content: templates.nuxtConfig },
    { path: 'types.ts', content: templates.types },
    { path: 'server/database/schema.ts', content: templates.schema },
    { path: 'server/database/queries.ts', content: templates.queries },
    { path: 'server/api/teams/[id]/crouton-collection-events/index.get.ts', content: templates.apiGet },
    { path: 'server/api/teams/[id]/crouton-collection-events/index.post.ts', content: templates.apiPost },
    { path: 'server/api/teams/[id]/crouton-collection-events/[eventId].patch.ts', content: templates.apiPatch },
    { path: 'server/api/teams/[id]/crouton-collection-events/[eventId].delete.ts', content: templates.apiDelete },
  ];

  for (const file of files) {
    const fullPath = path.join(basePath, file.path);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, file.content);
  }

  return files.map(f => f.path);
}

// ============================================================================
// Config Updates
// ============================================================================

async function updateNuxtConfig(projectRoot) {
  const configPath = path.join(projectRoot, 'nuxt.config.ts');

  if (!await fs.pathExists(configPath)) {
    console.log(chalk.yellow('  Warning: nuxt.config.ts not found, skipping auto-update'));
    return false;
  }

  let content = await fs.readFile(configPath, 'utf-8');

  // Check if already added
  if (content.includes(`'./${LAYER_PATH}'`) || content.includes(`"./${LAYER_PATH}"`)) {
    console.log(chalk.gray('  nuxt.config.ts already includes crouton-events layer'));
    return false;
  }

  // Find extends array and add the layer
  const extendsMatch = content.match(/extends:\s*\[([^\]]*)\]/s);
  if (extendsMatch) {
    const existingExtends = extendsMatch[1];
    const newExtends = existingExtends.trimEnd().endsWith(',')
      ? `${existingExtends}\n    './${LAYER_PATH}',`
      : existingExtends.trim()
        ? `${existingExtends},\n    './${LAYER_PATH}',`
        : `\n    './${LAYER_PATH}',\n  `;

    content = content.replace(
      /extends:\s*\[([^\]]*)\]/s,
      `extends: [${newExtends}]`
    );

    await fs.writeFile(configPath, content);
    return true;
  }

  console.log(chalk.yellow('  Warning: Could not find extends array in nuxt.config.ts'));
  console.log(chalk.yellow(`  Please manually add './${LAYER_PATH}' to your extends array`));
  return false;
}

async function updateSchemaIndex(projectRoot) {
  const schemaIndexPath = path.join(projectRoot, 'server/database/schema/index.ts');

  if (!await fs.pathExists(schemaIndexPath)) {
    console.log(chalk.yellow('  Warning: server/database/schema/index.ts not found, skipping auto-update'));
    return false;
  }

  let content = await fs.readFile(schemaIndexPath, 'utf-8');

  const exportLine = `export { croutonCollectionEvents } from '../../../${LAYER_PATH}/server/database/schema'`;

  // Check if already added
  if (content.includes('croutonCollectionEvents')) {
    console.log(chalk.gray('  schema/index.ts already exports croutonCollectionEvents'));
    return false;
  }

  // Add export at the end
  content = content.trimEnd() + '\n' + exportLine + '\n';

  await fs.writeFile(schemaIndexPath, content);
  return true;
}

// ============================================================================
// Main Function
// ============================================================================

export async function addEvents(options = {}) {
  const { dryRun = false, force = false } = options;
  const projectRoot = process.cwd();
  const layerFullPath = path.join(projectRoot, LAYER_PATH);

  console.log(chalk.bold('\nAdding crouton-events layer...\n'));

  // Check if layer already exists
  if (await fs.pathExists(layerFullPath)) {
    if (!force) {
      console.log(chalk.red(`Error: ${LAYER_PATH} already exists`));
      console.log(chalk.yellow('Use --force to overwrite'));
      process.exit(1);
    }
    console.log(chalk.yellow(`Warning: Overwriting existing ${LAYER_PATH}`));
  }

  if (dryRun) {
    console.log(chalk.cyan('Dry run - would create:'));
    console.log(chalk.gray(`  ${LAYER_PATH}/nuxt.config.ts`));
    console.log(chalk.gray(`  ${LAYER_PATH}/types.ts`));
    console.log(chalk.gray(`  ${LAYER_PATH}/server/database/schema.ts`));
    console.log(chalk.gray(`  ${LAYER_PATH}/server/database/queries.ts`));
    console.log(chalk.gray(`  ${LAYER_PATH}/server/api/teams/[id]/crouton-collection-events/index.get.ts`));
    console.log(chalk.gray(`  ${LAYER_PATH}/server/api/teams/[id]/crouton-collection-events/index.post.ts`));
    console.log(chalk.gray(`  ${LAYER_PATH}/server/api/teams/[id]/crouton-collection-events/[eventId].patch.ts`));
    console.log(chalk.gray(`  ${LAYER_PATH}/server/api/teams/[id]/crouton-collection-events/[eventId].delete.ts`));
    console.log(chalk.cyan('\nWould update:'));
    console.log(chalk.gray(`  nuxt.config.ts (add layer to extends)`));
    console.log(chalk.gray(`  server/database/schema/index.ts (add schema export)`));
    return;
  }

  // Create layer files
  const spinner = ora('Creating layer files...').start();
  try {
    const files = await createLayerFiles(layerFullPath);
    spinner.succeed(`Created ${files.length} files in ${LAYER_PATH}`);
  } catch (error) {
    spinner.fail('Failed to create layer files');
    throw error;
  }

  // Update nuxt.config.ts
  const configSpinner = ora('Updating nuxt.config.ts...').start();
  try {
    const updated = await updateNuxtConfig(projectRoot);
    if (updated) {
      configSpinner.succeed('Updated nuxt.config.ts');
    } else {
      configSpinner.info('nuxt.config.ts unchanged');
    }
  } catch (error) {
    configSpinner.fail('Failed to update nuxt.config.ts');
    console.error(chalk.red(error.message));
  }

  // Update schema index
  const schemaSpinner = ora('Updating schema index...').start();
  try {
    const updated = await updateSchemaIndex(projectRoot);
    if (updated) {
      schemaSpinner.succeed('Updated server/database/schema/index.ts');
    } else {
      schemaSpinner.info('schema/index.ts unchanged');
    }
  } catch (error) {
    schemaSpinner.fail('Failed to update schema index');
    console.error(chalk.red(error.message));
  }

  // Success message
  console.log(chalk.green('\n✓ crouton-events layer added successfully!\n'));

  console.log(chalk.bold('Next steps:'));
  console.log(chalk.cyan('  1. Run database migration:'));
  console.log(chalk.gray('     pnpm drizzle-kit generate'));
  console.log(chalk.gray('     pnpm drizzle-kit migrate'));
  console.log(chalk.cyan('\n  2. Add nuxt-crouton-events package (for auto-tracking):'));
  console.log(chalk.gray('     pnpm add @friendlyinternet/nuxt-crouton-events'));
  console.log(chalk.cyan('\n  3. Add to nuxt.config.ts extends:'));
  console.log(chalk.gray("     '@friendlyinternet/nuxt-crouton-events'"));
  console.log();
}

// CLI execution
if (process.argv[1].includes('add-events')) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  addEvents({ dryRun, force }).catch(error => {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  });
}