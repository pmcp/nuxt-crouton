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
import { join } from 'node:path'
import { z } from 'zod'
import { generateAllTemplates } from '../../utils/app-templates'

const execAsync = promisify(exec)

const CreateAppSchema = z.object({
  projectName: z.string().min(1).max(100),
  targetPath: z.string().min(1),
  collectionName: z.string().min(1).max(50),
  layerName: z.string().min(1).max(50),
  schema: z.record(z.string(), z.unknown()),
  templatesWritten: z.boolean().optional(),
  options: z.object({
    installDependencies: z.boolean().default(false),
    dialect: z.enum(['sqlite', 'pg']).default('sqlite'),
    includeAuth: z.boolean().default(false),
    includeI18n: z.boolean().default(false),
    hierarchy: z.boolean().optional(),
    sortable: z.boolean().optional(),
    seed: z.boolean().optional(),
    seedCount: z.number().optional()
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

  const { projectName, targetPath, collectionName, layerName, schema, templatesWritten, options } = parsed.data
  const projectPath = join(targetPath, projectName)

  const errors: string[] = []
  const warnings: string[] = []
  const filesCreated: string[] = []

  try {
    // Step 1: Validate target path is writable
    try {
      await access(targetPath, constants.W_OK)
    } catch {
      throw createError({
        statusCode: 400,
        statusMessage: `Target path is not writable: ${targetPath}`
      })
    }

    // Step 2: Create project directory
    console.log(`[create-app] Creating project at: ${projectPath}`)
    await mkdir(projectPath, { recursive: true })

    // Step 3: Write template files (if not done client-side)
    if (!templatesWritten) {
      console.log('[create-app] Writing template files...')

      const templates = generateAllTemplates({
        projectName,
        collectionName,
        layerName,
        schema,
        dialect: options.dialect,
        includeAuth: options.includeAuth,
        includeI18n: options.includeI18n,
        hierarchy: options.hierarchy,
        sortable: options.sortable,
        seed: options.seed,
        seedCount: options.seedCount
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

    // Step 4: Run crouton CLI to generate collection
    console.log('[create-app] Running crouton generator...')

    const schemaPath = `./schemas/${collectionName}.json`
    let cliFlags = `--fields-file=${schemaPath} --dialect=${options.dialect}`

    if (options.hierarchy) cliFlags += ' --hierarchy'
    if (options.sortable) cliFlags += ' --sortable'
    if (options.seed) cliFlags += ` --seed --count=${options.seedCount || 25}`

    const cliCommand = `npx crouton-generate ${layerName} ${collectionName} ${cliFlags}`

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

      // CLI might have partially succeeded - check for common errors
      if (cliError.message?.includes('ENOENT')) {
        errors.push('crouton-generate not found. The project was created but collection was not generated.')
        warnings.push('Run "pnpm install" then "pnpm crouton config" manually.')
      } else {
        errors.push(`CLI error: ${cliError.message}`)
      }
    }

    // Step 5: Install dependencies (if requested and no errors)
    if (options.installDependencies && errors.length === 0) {
      console.log('[create-app] Installing dependencies...')

      try {
        const { stdout } = await execAsync('pnpm install', {
          cwd: projectPath,
          timeout: 300000, // 5 minute timeout for install
          env: {
            ...process.env,
            FORCE_COLOR: '0'
          }
        })
        console.log('[create-app] Dependencies installed:', stdout.slice(0, 200))
      } catch (installError: any) {
        warnings.push(`Dependency installation failed: ${installError.message}. Run "pnpm install" manually.`)
      }
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
