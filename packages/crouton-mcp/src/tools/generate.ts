/**
 * Generate Collection Tool
 * Wraps the crouton CLI for collection generation
 */

import { z } from 'zod'
import {
  execCrouton,
  writeTempSchema,
  cleanupTempSchema,
  buildGenerateArgs,
  type GenerateOptions
} from '../utils/cli.js'

export interface GenerateCollectionInput {
  layer: string
  collection: string
  schema: Record<string, unknown>
  options?: GenerateOptions
}

export interface GenerateResult {
  success: boolean
  command: string
  output: string
  error?: string
  generatedPath: string
  dryRun: boolean
}

/**
 * Handle generate_collection tool call
 */
export async function handleGenerateCollection(
  input: GenerateCollectionInput
): Promise<GenerateResult> {
  const { layer, collection, schema, options = {} } = input

  // Write schema to temp file
  const schemaPath = await writeTempSchema(schema)

  try {
    // Build CLI arguments
    const args = buildGenerateArgs(layer, collection, schemaPath, options)

    // Execute crouton CLI
    const command = `npx crouton-generate ${args.join(' ')}`
    const result = await execCrouton(args)

    if (result.exitCode !== 0) {
      return {
        success: false,
        command,
        output: result.stdout,
        error: result.stderr || 'Generation failed with unknown error',
        generatedPath: `layers/${layer}/collections/${collection}/`,
        dryRun: options.dryRun ?? false
      }
    }

    return {
      success: true,
      command,
      output: result.stdout,
      generatedPath: `layers/${layer}/collections/${collection}/`,
      dryRun: options.dryRun ?? false
    }
  } finally {
    // Clean up temp schema file
    await cleanupTempSchema(schemaPath)
  }
}

export const generateCollectionInputSchema = {
  layer: z.string().describe('Target layer name (e.g., \'shop\', \'blog\', \'core\')'),
  collection: z.string().describe('Collection name in singular form (e.g., \'product\', \'post\')'),
  schema: z.record(z.any()).describe('The validated schema object'),
  options: z
    .object({
      dialect: z.enum(['sqlite', 'pg']).optional().describe('Database dialect (default: sqlite)'),
      hierarchy: z
        .boolean()
        .optional()
        .describe('Enable hierarchy support (parentId, path, depth, order)'),
      noTranslations: z.boolean().optional().describe('Skip translation fields'),
      force: z.boolean().optional().describe('Overwrite existing files'),
      dryRun: z.boolean().optional().describe('Preview without writing files'),
      noDb: z.boolean().optional().describe('Skip database table creation')
    })
    .optional()
    .describe('Generation options')
}

export const generateCollectionToolDefinition = {
  name: 'generate_collection',
  description: `Generate a collection from a validated schema.
Creates CRUD files, API endpoints, database schema, and components.
IMPORTANT: Always validate the schema first with validate_schema.`
}
