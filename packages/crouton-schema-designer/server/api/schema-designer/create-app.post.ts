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
import { detectMonorepoContext } from '../../utils/monorepo-detection'

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

// Schema for a package to include
const PackageConfigSchema = z.object({
  packageId: z.string().min(1),
  layerName: z.string().min(1),
  config: z.record(z.string(), z.unknown()).optional().default({}),
  npmPackage: z.string().optional()
})

const CreateAppSchema = z.object({
  projectName: z.string().min(1).max(100),
  targetPath: z.string().min(1),
  layerName: z.string().min(1).max(50),
  /** Multiple collections to generate */
  collections: z.array(CollectionConfigSchema).min(1),
  /** Packages to include (e.g., crouton-bookings) */
  packages: z.array(PackageConfigSchema).optional().default([]),
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
      status: 403,
      statusText: 'Create App is only available in development mode'
    })
  }

  // Parse and validate request
  const body = await readBody(event)
  const parsed = CreateAppSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      status: 400,
      statusText: 'Invalid request',
      data: parsed.error.flatten()
    })
  }

  const { projectName, targetPath, layerName, collections, packages, templatesWritten, options } = parsed.data
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
          status: 400,
          statusText: `Target path is not writable: ${targetPath} (parent directory ${pathToCheck} is not accessible)`
        })
      }
    }

    // Create target directory if it doesn't exist
    await mkdir(targetPath, { recursive: true })

    // Step 2: Create project directory
    console.log(`[create-app] Creating project at: ${projectPath} with ${collections.length} collection(s)`)
    await mkdir(projectPath, { recursive: true })

    // Detect monorepo context for local package references
    const monorepoContext = detectMonorepoContext()
    console.log('[create-app] Monorepo detection:', JSON.stringify(monorepoContext, null, 2))

    // Step 3: Write template files (if not done client-side)
    if (!templatesWritten) {
      console.log('[create-app] Writing template files...')
      console.log('[create-app] Options:', { includeAuth: options.includeAuth, includeI18n: options.includeI18n })

      const templates = generateAllTemplates({
        projectName,
        layerName,
        collections,
        packages,
        dialect: options.dialect,
        includeAuth: options.includeAuth,
        includeI18n: options.includeI18n,
        monorepoContext
      })

      // Log the package.json content for debugging
      const pkgJson = templates.find(t => t.path === 'package.json')
      if (pkgJson) {
        console.log('[create-app] Generated package.json:', pkgJson.content)
      }

      // Log the nuxt.config.ts content for debugging
      const nuxtConfig = templates.find(t => t.path === 'nuxt.config.ts')
      if (nuxtConfig) {
        console.log('[create-app] Generated nuxt.config.ts:', nuxtConfig.content)
      }

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

      console.log(`[create-app] Created ${filesCreated.length} files:`, filesCreated)
    } else {
      console.log('[create-app] Templates already written client-side, skipping...')
    }

    // Step 4: Install dependencies (required for CLI to work)
    // Always install because we need the CLI package to generate collections
    console.log('[create-app] Installing dependencies...')

    // Try different pnpm paths to avoid Corepack shim issues
    const pnpmPaths = [
      '/opt/homebrew/bin/pnpm', // Homebrew (macOS ARM)
      '/usr/local/bin/pnpm',    // Homebrew (macOS Intel)
      'pnpm'                     // Fall back to PATH
    ]

    let installSuccess = false
    for (const pnpmPath of pnpmPaths) {
      try {
        const { stdout } = await execAsync(`${pnpmPath} install`, {
          cwd: projectPath,
          timeout: 300000, // 5 minute timeout for install
          env: {
            ...process.env,
            FORCE_COLOR: '0',
            COREPACK_ENABLE: '0'
          }
        })
        console.log('[create-app] Dependencies installed:', stdout.slice(0, 200))
        installSuccess = true
        break
      } catch (e: any) {
        console.log(`[create-app] ${pnpmPath} failed:`, e.message?.slice(0, 100))
        continue
      }
    }

    if (!installSuccess) {
      errors.push('Dependency installation failed. Run "pnpm install" manually.')
      return {
        success: false,
        projectPath,
        errors,
        warnings,
        filesCreated
      }
    }

    // Step 5: Find CLI path (needed for both module add and collection generation)
    const possibleCliPaths = [
      join(process.cwd(), 'packages/nuxt-crouton-cli/bin/crouton-generate.js'),
      join(process.cwd(), '../../packages/nuxt-crouton-cli/bin/crouton-generate.js'), // From apps/schema-designer
      join(dirname(new URL(import.meta.url).pathname), '../../../../nuxt-crouton-cli/bin/crouton-generate.js') // Relative to this file
    ]

    let cliPath = ''
    for (const path of possibleCliPaths) {
      try {
        await access(path, constants.R_OK)
        cliPath = path
        break
      } catch {
        continue
      }
    }

    if (!cliPath) {
      errors.push('CLI not found. Tried: ' + possibleCliPaths.join(', '))
      return {
        success: false,
        projectPath,
        errors,
        warnings,
        filesCreated
      }
    }

    console.log('[create-app] Using CLI at:', cliPath)

    // Step 6: Run crouton add for enabled modules (handles schema exports + migrations)
    const modulesToAdd: string[] = []
    if (options.includeAuth) modulesToAdd.push('auth')
    if (options.includeI18n) modulesToAdd.push('i18n')

    if (modulesToAdd.length > 0) {
      console.log('[create-app] Adding modules:', modulesToAdd.join(', '))

      for (const moduleName of modulesToAdd) {
        try {
          // Use --skip-install since packages are already in package.json and installed
          // Use --skip-migrations since nuxt prepare hasn't run yet (migrations handled by final generate step)
          const addCommand = `node ${cliPath} add ${moduleName} --skip-install --skip-migrations`
          console.log(`[create-app] Running: ${addCommand}`)

          const { stdout, stderr } = await execAsync(addCommand, {
            cwd: projectPath,
            timeout: 120000,
            env: {
              ...process.env,
              FORCE_COLOR: '0'
            }
          })

          if (stdout) {
            console.log(`[create-app] crouton add ${moduleName} output:`, stdout)
          }
          if (stderr) {
            console.warn(`[create-app] crouton add ${moduleName} stderr:`, stderr)
          }
        } catch (addError: any) {
          console.error(`[create-app] crouton add ${moduleName} error:`, addError.message)
          warnings.push(`Module setup warning for ${moduleName}: ${addError.message}. Run "crouton add ${moduleName}" manually.`)
        }
      }
    }

    // Step 7: Run crouton CLI to generate collections
    console.log('[create-app] Running crouton generator...')

    const configPath = join(projectPath, 'crouton.config.js')
    const cliCommand = `node ${cliPath} --config ${configPath}`

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
