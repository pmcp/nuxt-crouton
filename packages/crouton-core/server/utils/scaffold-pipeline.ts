/**
 * Server-side scaffold pipeline shared by crouton-designer and crouton-atelier.
 *
 * Runs 7 steps: scaffold → schemas → seedData → config → install → generate → doctor
 */

import { spawn } from 'node:child_process'
import { writeFile, readFile, mkdir, access } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { createJiti } from 'jiti'
import type { ScaffoldStepResult, ScaffoldResult } from '../../shared/types/scaffold'

export interface ScaffoldPipelineOptions {
  appName: string
  packages: string[]
  schemas: Record<string, string>
  seedData?: Record<string, Array<Record<string, unknown>>>
  packageCollections?: Array<{ name: string; layerName: string }>
  /** Extra options merged into buildCroutonConfig call (e.g., publishableCollections, locales) */
  configExtra?: Record<string, unknown>
}

const BUNDLED_PACKAGES = ['auth', 'admin', 'i18n', 'core']

export async function executeScaffoldPipeline(options: ScaffoldPipelineOptions): Promise<ScaffoldResult> {
  const jiti = createJiti(import.meta.url, { interopDefault: true })

  const monorepoRoot = await findMonorepoRoot(process.cwd())
  if (!monorepoRoot) {
    throw createError({
      status: 500,
      statusText: 'Could not find monorepo root (pnpm-workspace.yaml)',
    })
  }

  const appDir = join(monorepoRoot, 'apps', options.appName)

  if (await pathExists(appDir)) {
    throw createError({
      status: 409,
      statusText: `App "${options.appName}" already exists at apps/${options.appName}/`,
    })
  }

  const steps: Record<string, ScaffoldStepResult> = {}

  // Step 1: Scaffold app via CLI
  const features = options.packages
    .map(p => p.replace(/^crouton-/, ''))
    .filter(p => !BUNDLED_PACKAGES.includes(p))

  try {
    const { scaffoldApp } = await jiti.import('@fyit/crouton-cli/lib/scaffold-app') as any
    const result = await scaffoldApp(options.appName, {
      features,
      dialect: 'sqlite',
      cf: true,
      outDir: appDir,
    })
    steps.scaffold = { success: true, files: result.files.map((f: any) => f.path) }
  }
  catch (err: any) {
    steps.scaffold = { success: false, error: err.message }
    return { success: false, appDir: `apps/${options.appName}`, steps }
  }

  // Step 2: Write schema files
  try {
    const schemasDir = join(appDir, 'schemas')
    await mkdir(schemasDir, { recursive: true })
    const files: string[] = []

    // Write user-provided schemas
    for (const [name, content] of Object.entries(options.schemas)) {
      const filename = name.endsWith('.json') ? name : `${name}.json`
      await writeFile(join(schemasDir, filename), content, 'utf-8')
      files.push(`schemas/${filename}`)
    }

    // For package-only collections not in user schemas, read from the package
    const coveredSchemas = new Set(Object.keys(options.schemas))
    for (const pkg of options.packageCollections || []) {
      if (coveredSchemas.has(pkg.name)) continue
      const pkgSchemaPath = join(monorepoRoot, 'packages', `crouton-${pkg.layerName}`, 'schemas', `${pkg.name}.json`)
      if (await pathExists(pkgSchemaPath)) {
        const content = await readFile(pkgSchemaPath, 'utf-8')
        await writeFile(join(schemasDir, `${pkg.name}.json`), content, 'utf-8')
        files.push(`schemas/${pkg.name}.json`)
      }
    }

    steps.schemas = { success: true, files }
  }
  catch (err: any) {
    steps.schemas = { success: false, error: err.message }
  }

  // Step 3: Write seed data files
  try {
    const files: string[] = []
    if (options.seedData && Object.keys(options.seedData).length > 0) {
      const schemasDir = join(appDir, 'schemas')
      await mkdir(schemasDir, { recursive: true })

      for (const [collectionName, entries] of Object.entries(options.seedData)) {
        if (!entries?.length) continue
        const filename = `${collectionName}.seed.json`
        await writeFile(
          join(schemasDir, filename),
          JSON.stringify(entries, null, 2),
          'utf-8'
        )
        files.push(`schemas/${filename}`)
      }
    }
    steps.seedData = { success: true, files }
  }
  catch (err: any) {
    steps.seedData = { success: false, error: err.message }
  }

  // Step 4: Generate crouton.config.js
  try {
    const { buildCroutonConfig } = await jiti.import('@fyit/crouton-cli/lib/utils/config-builder') as any
    const configContent = buildCroutonConfig({
      appName: options.appName,
      packages: options.packages,
      schemas: options.schemas,
      seedData: options.seedData,
      packageCollections: options.packageCollections,
      ...options.configExtra,
    })
    await writeFile(join(appDir, 'crouton.config.js'), configContent, 'utf-8')
    steps.config = { success: true }
  }
  catch (err: any) {
    steps.config = { success: false, error: err.message }
  }

  // Step 5: Run pnpm install from monorepo root
  try {
    await spawnAsync('pnpm', ['install'], { cwd: monorepoRoot })
    steps.install = { success: true }
  }
  catch (err: any) {
    steps.install = { success: false, error: err.message }
  }

  // Step 6: Run crouton config to generate collections
  // Note: generate-collection.mjs uses top-level await and process.argv,
  // so it can't be cleanly imported in a server context. Keep as subprocess.
  try {
    const output = await spawnAsync('pnpm', ['crouton', 'config', './crouton.config.js'], { cwd: appDir })
    steps.generate = { success: true, output }
  }
  catch (err: any) {
    steps.generate = { success: false, error: err.message }
  }

  // Step 7: Run doctor to validate (direct import)
  try {
    const { doctor } = await jiti.import('@fyit/crouton-cli/lib/doctor') as any
    const result = await doctor(appDir)
    steps.doctor = { success: true, checks: result.checks }
  }
  catch (err: any) {
    // Doctor warnings are not fatal
    steps.doctor = { success: true, error: err.message }
  }

  const allSuccess = Object.values(steps).every(s => s.success)

  return {
    success: allSuccess,
    appDir: `apps/${options.appName}`,
    steps,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

export function spawnAsync(cmd: string, args: string[], opts: { cwd: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = '', stderr = ''
    child.stdout?.on('data', (d: Buffer) => { stdout += d })
    child.stderr?.on('data', (d: Buffer) => { stderr += d })
    child.on('close', code => code === 0 ? resolve(stdout) : reject(new Error(stderr || stdout)))
  })
}

export async function findMonorepoRoot(startDir: string): Promise<string | null> {
  let dir = resolve(startDir)
  const root = resolve('/')

  while (dir !== root) {
    try {
      await access(join(dir, 'pnpm-workspace.yaml'))
      return dir
    }
    catch {
      dir = resolve(dir, '..')
    }
  }
  return null
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  }
  catch {
    return false
  }
}
