import { spawn } from 'node:child_process'
import { writeFile, readFile, mkdir, access } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { createJiti } from 'jiti'

const jiti = createJiti(import.meta.url, { interopDefault: true })

interface AtelierScaffoldRequest {
  appName: string
  packages: string[]
  schemas: Record<string, string>
  seedData?: Record<string, Array<Record<string, unknown>>>
  packageCollections?: Array<{ name: string, layerName: string }>
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

  const body = await readBody<AtelierScaffoldRequest>(event)

  if (!body.appName || !/^[a-z][a-z0-9-]*$/.test(body.appName)) {
    throw createError({
      status: 400,
      statusText: 'Invalid app name. Use lowercase letters, numbers, and hyphens.'
    })
  }

  const monorepoRoot = await findMonorepoRoot(process.cwd())
  if (!monorepoRoot) {
    throw createError({
      status: 500,
      statusText: 'Could not find monorepo root (pnpm-workspace.yaml)'
    })
  }

  const appDir = join(monorepoRoot, 'apps', body.appName)

  if (await pathExists(appDir)) {
    throw createError({
      status: 409,
      statusText: `App "${body.appName}" already exists at apps/${body.appName}/`
    })
  }

  const steps: Record<string, StepResult> = {}

  // Step 1: Scaffold app via CLI
  const features = (body.packages || [])
    .map(p => p.replace(/^crouton-/, ''))
    .filter(p => !['auth', 'admin', 'i18n', 'core'].includes(p))

  try {
    const { scaffoldApp } = await jiti.import('@fyit/crouton-cli/lib/scaffold-app') as any
    const result = await scaffoldApp(body.appName, {
      features,
      dialect: 'sqlite',
      cf: true,
      outDir: appDir
    })
    steps.scaffold = { success: true, files: result.files.map((f: any) => f.path) }
  } catch (err: any) {
    steps.scaffold = { success: false, error: err.message }
    return { success: false, appDir: `apps/${body.appName}`, steps }
  }

  // Step 2: Write schema files
  try {
    const schemasDir = join(appDir, 'schemas')
    await mkdir(schemasDir, { recursive: true })
    const files: string[] = []

    for (const [name, content] of Object.entries(body.schemas)) {
      const filename = name.endsWith('.json') ? name : `${name}.json`
      await writeFile(join(schemasDir, filename), content, 'utf-8')
      files.push(`schemas/${filename}`)
    }

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
  } catch (err: any) {
    steps.schemas = { success: false, error: err.message }
  }

  // Step 3: Write seed data
  try {
    const files: string[] = []
    if (body.seedData && Object.keys(body.seedData).length > 0) {
      const schemasDir = join(appDir, 'schemas')
      await mkdir(schemasDir, { recursive: true })

      for (const [collectionName, entries] of Object.entries(body.seedData)) {
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
  } catch (err: any) {
    steps.seedData = { success: false, error: err.message }
  }

  // Step 4: Generate crouton.config.js
  try {
    const { buildCroutonConfig } = await jiti.import('@fyit/crouton-cli/lib/utils/config-builder') as any
    const configContent = buildCroutonConfig({
      appName: body.appName,
      packages: body.packages,
      schemas: body.schemas,
      seedData: body.seedData,
      packageCollections: body.packageCollections
    })
    await writeFile(join(appDir, 'crouton.config.js'), configContent, 'utf-8')
    steps.config = { success: true }
  } catch (err: any) {
    steps.config = { success: false, error: err.message }
  }

  // Step 5: pnpm install
  try {
    await spawnAsync('pnpm', ['install'], { cwd: monorepoRoot })
    steps.install = { success: true }
  } catch (err: any) {
    steps.install = { success: false, error: err.message }
  }

  // Step 6: crouton config (generate collections)
  try {
    const output = await spawnAsync('pnpm', ['crouton', 'config', './crouton.config.js'], { cwd: appDir })
    steps.generate = { success: true, output }
  } catch (err: any) {
    steps.generate = { success: false, error: err.message }
  }

  // Step 7: Doctor validation
  try {
    const { doctor } = await jiti.import('@fyit/crouton-cli/lib/doctor') as any
    const result = await doctor(appDir)
    steps.doctor = { success: true, checks: result.checks }
  } catch (err: any) {
    steps.doctor = { success: true, error: err.message }
  }

  const allSuccess = Object.values(steps).every(s => s.success)

  return { success: allSuccess, appDir: `apps/${body.appName}`, steps }
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
    } catch {
      dir = resolve(dir, '..')
    }
  }
  return null
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}
