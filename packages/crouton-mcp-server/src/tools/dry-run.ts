import { z } from 'zod'
import { runCli } from '../utils/cli.js'

export const dryRunInputSchema = {
  layer: z.string().describe('Target layer name'),
  collection: z.string().describe('Collection name'),
  schema: z.string().describe('Schema JSON as a string'),
  dialect: z.enum(['pg', 'sqlite']).optional().describe('Database dialect')
}

export const dryRunToolDefinition = {
  name: 'dry_run',
  description: 'Preview what files would be generated without actually writing them. Use this before generate_collection to verify the output.'
}

export async function handleDryRun(args: {
  layer: string
  collection: string
  schema: string
  dialect?: 'pg' | 'sqlite'
}): Promise<{ success: boolean; preview: string; files?: string[]; error?: string }> {
  try {
    // Write schema to temp file
    const fs = await import('fs/promises')
    const path = await import('path')
    const os = await import('os')

    const tempDir = os.tmpdir()
    const schemaPath = path.join(tempDir, `crouton-schema-${Date.now()}.json`)
    await fs.writeFile(schemaPath, args.schema)

    // Run CLI with --dry-run
    const cliArgs = [
      'generate',
      args.layer,
      args.collection,
      '--fields-file', schemaPath,
      '--dialect', args.dialect || 'pg',
      '--dry-run'
    ]

    const result = await runCli(cliArgs)

    // Clean up temp file
    await fs.unlink(schemaPath).catch(() => {})

    if (result.success) {
      // Parse output to extract file list
      const lines = result.output.split('\n')
      const files = lines.filter(line => line.includes('Would create:') || line.includes('→'))

      return {
        success: true,
        preview: result.output,
        files
      }
    } else {
      return {
        success: false,
        preview: result.output,
        error: result.error
      }
    }
  } catch (error) {
    return {
      success: false,
      preview: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
