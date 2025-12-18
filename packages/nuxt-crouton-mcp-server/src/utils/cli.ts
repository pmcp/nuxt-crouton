/**
 * CLI execution utilities for running crouton commands
 */

import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { writeFile, unlink, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'

const execAsync = promisify(exec)

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

export interface GenerateOptions {
  dialect?: 'sqlite' | 'pg'
  hierarchy?: boolean
  noTranslations?: boolean
  force?: boolean
  dryRun?: boolean
  noDb?: boolean
}

/**
 * Execute a crouton CLI command
 */
export async function execCrouton(
  args: string[],
  options: { timeout?: number; cwd?: string } = {}
): Promise<ExecResult> {
  const { timeout = 60000, cwd = process.cwd() } = options

  const command = `npx crouton-generate ${args.join(' ')}`

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout,
      cwd,
      env: { ...process.env, FORCE_COLOR: '0' }
    })

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0
    }
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; code?: number }
    return {
      stdout: execError.stdout?.trim() || '',
      stderr: execError.stderr?.trim() || String(error),
      exitCode: execError.code || 1
    }
  }
}

/**
 * Write a schema to a temporary file and return the path
 */
export async function writeTempSchema(schema: Record<string, unknown>): Promise<string> {
  const tempDir = join(tmpdir(), 'crouton-mcp')
  await mkdir(tempDir, { recursive: true })

  const filename = `schema-${randomUUID()}.json`
  const filepath = join(tempDir, filename)

  await writeFile(filepath, JSON.stringify(schema, null, 2), 'utf-8')

  return filepath
}

/**
 * Clean up a temporary schema file
 */
export async function cleanupTempSchema(filepath: string): Promise<void> {
  try {
    await unlink(filepath)
  } catch {
    // Ignore errors - file may already be deleted
  }
}

/**
 * Build CLI arguments for generate command
 */
export function buildGenerateArgs(
  layer: string,
  collection: string,
  schemaPath: string,
  options: GenerateOptions = {}
): string[] {
  const args = [layer, collection, `--fields-file=${schemaPath}`]

  if (options.dialect) {
    args.push(`--dialect=${options.dialect}`)
  }

  if (options.hierarchy) {
    args.push('--hierarchy')
  }

  if (options.noTranslations) {
    args.push('--no-translations')
  }

  if (options.force) {
    args.push('--force')
  }

  if (options.dryRun) {
    args.push('--dry-run')
  }

  if (options.noDb) {
    args.push('--no-db')
  }

  return args
}

/**
 * Simple CLI runner for tools - returns success/output/error format
 */
export async function runCli(
  args: string[],
  options: { timeout?: number; cwd?: string } = {}
): Promise<{ success: boolean; output: string; error?: string }> {
  const result = await execCrouton(args, options)

  return {
    success: result.exitCode === 0,
    output: result.stdout || result.stderr,
    error: result.exitCode !== 0 ? result.stderr : undefined
  }
}
