/**
 * Create App API Endpoint
 *
 * Creates a new Nuxt Crouton app from a designed schema.
 * Writes template files and runs the crouton CLI.
 *
 * SECURITY: Only works in local development (not production)
 */

import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, writeFile, access, constants } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { z } from 'zod'
import { generateAllTemplates } from '../../utils/app-templates'

const execAsync = promisify(exec)

// Schema for a single collection config
const CollectionConfigSchema = z.object({
  name: z.string().min(1).max(50),
  schema: z.record(z.string(), z.unknown()),
  hierarchy: z.boolean().optional(),
  sortable: z.boolean().optional(),
  seed: z.boolean().optional(),
  seedCount: z.number().optional()
})

const CreateAppSchema = z.object({
  projectName: z.string().min(1).max(100),
  targetPath: z.string().min(1),
  layerName: z.string().min(1).max(50),
  /** Multiple collections to generate */
  collections: z.array(CollectionConfigSchema).min(1),
  templatesWritten: z.boolean().optional(),
  options: z.object({
    dialect: z.enum(['sqlite', 'pg']).default('sqlite'),
    includeAuth: z.boolean().default(false),
    includeI18n: z.boolean().default(false)
  })
})

export default defineEventHandler(async (event) => {
  // Security check: Only allow in development
  if (process.env.NODE_ENV === 'production') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Create App is only available in development mode'
    })
  }

  // Parse and validate request
  const body = await readBody(event)
  const parsed = CreateAppSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request',
      data: parsed.error.flatten()
    })
  }

  const { projectName, targetPath, layerName, collections, templatesWritten, options } = parsed.data
  const projectPath = join(targetPath, projectName)

  const errors: string[] = []
  const warnings: string[] = []
  const filesCreated: string[] = []

  try {
    // Step 1: Validate target path is writable
    // If target doesn't exist, check if parent directory is writable (we'll create it)
    let pathToCheck = targetPath
    try {
      await access(targetPath, constants.W_OK)
    } catch {
      // Target doesn't exist - check parent directory instead
      pathToCheck = dirname(targetPath)
      try {
        await access(pathToCheck, constants.W_OK)
      } catch {
        throw createError({
          statusCode: 400,
          statusMessage: `Target path is not writable: ${targetPath} (parent directory ${pathToCheck} is not accessible)`
        })
      }
    }

    // Create target directory if it doesn't exist
    await mkdir(targetPath, { recursive: true })

    // Step 2: Create project directory
    console.log(`[create-app] Creating project at: ${projectPath} with ${collections.length} collection(s)`)
    await mkdir(projectPath, { recursive: true })

    // Step 3: Write template files (if not done client-side)
    if (!templatesWritten) {
      console.log('[create-app] Writing template files...')

      const templates = generateAllTemplates({
        projectName,
        layerName,
        collections,
        dialect: options.dialect,
        includeAuth: options.includeAuth,
        includeI18n: options.includeI18n
      })

      for (const template of templates) {
        const filePath = join(projectPath, template.path)
        const dirPath = join(projectPath, template.path.split('/').slice(0, -1).join('/'))

        // Create directory if needed
        if (dirPath !== projectPath) {
          await mkdir(dirPath, { recursive: true })
        }

        await writeFile(filePath, template.content, 'utf-8')
        filesCreated.push(template.path)
      }

      console.log(`[create-app] Created ${filesCreated.length} files`)
    }

    // Step 4: Install dependencies (required for CLI to work)
    // Always install because we need the CLI package to generate collections
    console.log('[create-app] Installing dependencies...')

    try {
      const { stdout } = await execAsync('pnpm install', {
        cwd: projectPath,
        timeout: 300000, // 5 minute timeout for install
        env: {
          ...process.env,
          FORCE_COLOR: '0',
          COREPACK_ENABLE_DOWNLOAD_PROMPT: '0' // Auto-accept Corepack downloads
        }
      })
      console.log('[create-app] Dependencies installed:', stdout.slice(0, 200))
    } catch (installError: any) {
      errors.push(`Dependency installation failed: ${installError.message}. Run "pnpm install" manually.`)
      // Can't proceed without dependencies
      return {
        success: false,
        projectPath,
        errors,
        warnings,
        filesCreated
      }
    }

    // Step 5: Run crouton CLI to generate collections
    // Uses crouton.config.js which contains all collection configs
    console.log('[create-app] Running crouton generator...')

    const cliCommand = `npx crouton-generate config`

    try {
      const { stdout, stderr } = await execAsync(cliCommand, {
        cwd: projectPath,
        timeout: 120000, // 2 minute timeout
        env: {
          ...process.env,
          FORCE_COLOR: '0' // Disable colors for cleaner output
        }
      })

      if (stdout) {
        console.log('[create-app] CLI output:', stdout)
      }
      if (stderr) {
        console.warn('[create-app] CLI stderr:', stderr)
        warnings.push(stderr)
      }
    } catch (cliError: any) {
      console.error('[create-app] CLI error:', cliError)
      errors.push(`CLI error: ${cliError.message}`)
      warnings.push('Run "npx crouton-generate config" manually to generate collections.')
    }

    return {
      success: errors.length === 0,
      projectPath,
      errors,
      warnings,
      filesCreated
    }

  } catch (e: any) {
    console.error('[create-app] Error:', e)

    return {
      success: false,
      projectPath,
      errors: [e.message || 'Unknown error'],
      warnings,
      filesCreated
    }
  }
})
