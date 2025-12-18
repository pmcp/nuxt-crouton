import { z } from 'zod'
import { runCli } from '../utils/cli.js'

export const rollbackInputSchema = {
  layer: z.string().describe('Layer containing the collection'),
  collection: z.string().describe('Collection to remove'),
  dryRun: z.boolean().default(true).describe('Preview without actually removing (default: true for safety)')
}

export const rollbackToolDefinition = {
  name: 'rollback',
  description: 'Remove a generated collection and its files. Defaults to dry-run mode for safety.'
}

export async function handleRollback(args: {
  layer: string
  collection: string
  dryRun?: boolean
}): Promise<{ success: boolean; message: string; removedFiles?: string[]; error?: string }> {
  try {
    const cliArgs = [
      'rollback',
      args.layer,
      args.collection
    ]

    // Add dry-run flag if enabled (default)
    if (args.dryRun !== false) {
      cliArgs.push('--dry-run')
    }

    const result = await runCli(cliArgs)

    if (result.success) {
      // Parse output to extract removed files
      const lines = result.output.split('\n')
      const removedFiles = lines.filter(line =>
        line.includes('Would remove:') ||
        line.includes('Removed:') ||
        line.includes('→')
      )

      const isDryRun = args.dryRun !== false
      const message = isDryRun
        ? `Dry run complete. ${removedFiles.length} files would be removed. Run with dryRun=false to actually remove.`
        : `Rollback complete. ${removedFiles.length} files removed.`

      return {
        success: true,
        message,
        removedFiles
      }
    } else {
      return {
        success: false,
        message: 'Rollback failed',
        error: result.error || result.output
      }
    }
  } catch (error) {
    return {
      success: false,
      message: 'Rollback failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
