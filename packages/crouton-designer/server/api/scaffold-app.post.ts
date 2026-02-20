import { spawn } from 'node:child_process'
import { writeFile, readFile, mkdir, access } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { createJiti } from 'jiti'

// Use jiti for CLI imports — the CLI package has .mjs files that import .ts
// files transitively, which Node's native ESM loader can't handle.
const jiti = createJiti(import.meta.url, { interopDefault: true })

interface ScaffoldRequest {
  appName: string
  config: {
    name: string
    packages?: string[]
  }
  schemas: Record<string, string>
  seedData?: Record<string, Array<Record<string, any>>>
  packageCollections?: Array<{ name: string; layerName: string }>
  publishableCollections?: string[]
}

interface StepResult {
  success: boolean
  error?: string
  files?: string[]
  output?: string
  checks?: Array<{ name: string, status: string, message: string }>
}

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const body = await readBody<ScaffoldRequest>(event)

  // Validate appName
  if (!body.appName || !/^[a-z][a-z0-9-]*$/.test(body.appName)) {
    throw createError({
      status: 400,
      statusText: 'Invalid app name. Use lowercase letters, numbers, and hyphens.'
    })
  }

  if (!body.schemas || Object.keys(body.schemas).length === 0) {
    throw createError({
      status: 400,
      statusText: 'At least one schema is required.'
    })
  }

  // Resolve monorepo root by walking up looking for pnpm-workspace.yaml
  const monorepoRoot = await findMonorepoRoot(process.cwd())
  if (!monorepoRoot) {
    throw createError({
      status: 500,
      statusText: 'Could not find monorepo root (pnpm-workspace.yaml)'
    })
  }

  const appDir = join(monorepoRoot, 'apps', body.appName)

  // Check if app already exists
  if (await pathExists(appDir)) {
    throw createError({
      status: 409,
      statusText: `App "${body.appName}" already exists at apps/${body.appName}/`
    })
  }

  const steps: Record<string, StepResult> = {}

  // Step 1: Run scaffold-app (direct import — same code path as crouton init)
  const features = (body.config.packages || [])
    .map(p => p.replace(/^crouton-/, ''))
    .filter(p => !['auth', 'admin', 'i18n', 'core'].includes(p)) // bundled

  try {
    const { scaffoldApp } = await jiti.import('@fyit/crouton-cli/lib/scaffold-app') as any
    const result = await scaffoldApp(body.appName, {
      features,
      dialect: 'sqlite',
      cf: true,
      outDir: appDir
    })
    steps.scaffold = { success: true, files: result.files.map((f: any) => f.path) }
  }
  catch (err: any) {
    steps.scaffold = { success: false, error: err.message }
    // If scaffold fails, return early — nothing else can proceed
    return {
      success: false,
      appDir: `apps/${body.appName}`,
      steps
    }
  }

  // Step 2: Write schema files.
  // - User-provided schemas (booking, location, etc.) are written as-is from body.schemas.
  // - Package-only collections (e.g. pages from crouton-pages) are NOT in body.schemas
  //   because the designer doesn't send empty package schemas. Instead we read the
  //   package's own schema file from the monorepo and write it here.
  try {
    const schemasDir = join(appDir, 'schemas')
    await mkdir(schemasDir, { recursive: true })
    const files: string[] = []

    // Write user-provided schemas (may include schemas for package-layer collections)
    for (const [name, content] of Object.entries(body.schemas)) {
      const filename = name.endsWith('.json') ? name : `${name}.json`
      await writeFile(join(schemasDir, filename), content, 'utf-8')
      files.push(`schemas/${filename}`)
    }

    // For package-only collections (no user schema provided), read from the package.
    // Convention: packages/crouton-{layerName}/schemas/{collectionName}.json
    const coveredSchemas = new Set(Object.keys(body.schemas))
    for (const pkg of body.packageCollections || []) {
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
    if (body.seedData && Object.keys(body.seedData).length > 0) {
      const schemasDir = join(appDir, 'schemas')
      await mkdir(schemasDir, { recursive: true })

      for (const [collectionName, entries] of Object.entries(body.seedData)) {
        if (!entries || entries.length === 0) continue
        // Strip _id from entries (synthetic field from designer)
        const cleaned = entries.map(({ _id, ...rest }) => rest)
        const filename = `${collectionName}.seed.json`
        await writeFile(
          join(schemasDir, filename),
          JSON.stringify(cleaned, null, 2),
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

  // Step 4: Generate crouton.config.js with collections + targets
  try {
    const { buildCroutonConfig } = await jiti.import('@fyit/crouton-cli/lib/utils/config-builder') as any
    const configContent = buildCroutonConfig({
      appName: body.appName,
      packages: body.config.packages,
      schemas: body.schemas,
      seedData: body.seedData,
      packageCollections: body.packageCollections,
      publishableCollections: body.publishableCollections
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
    appDir: `apps/${body.appName}`,
    steps
  }
})

// ─── Helpers ──────────────────────────────────────────────────────

function spawnAsync(cmd: string, args: string[], opts: { cwd: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = '', stderr = ''
    child.stdout?.on('data', (d: Buffer) => { stdout += d })
    child.stderr?.on('data', (d: Buffer) => { stderr += d })
    child.on('close', code => code === 0 ? resolve(stdout) : reject(new Error(stderr || stdout)))
  })
}

async function findMonorepoRoot(startDir: string): Promise<string | null> {
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
