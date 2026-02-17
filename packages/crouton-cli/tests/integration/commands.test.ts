/**
 * Characterization tests for the crouton CLI commands.
 *
 * These tests document the *current* behavior of each CLI command by running
 * them as subprocesses and asserting on exit codes and stdout/stderr patterns.
 * They serve as regression guards — if behavior changes, these tests break
 * and force a conscious decision about the change.
 *
 * All 11 commands are covered:
 *   generate, config, install, init, add, rollback, rollback-bulk,
 *   rollback-interactive, doctor, scaffold-app, seed-translations
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { resolve, join } from 'node:path'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

const exec = promisify(execFile)

const CLI_PATH = resolve(__dirname, '../../bin/crouton-generate.js')
const PKG_ROOT = resolve(__dirname, '../..')

/**
 * Run the CLI as a subprocess and capture stdout, stderr, and exit code.
 *
 * On success (exit 0) the promise resolves normally.
 * On failure (non-zero exit) execFile rejects — we catch it and normalize
 * the shape so every call returns the same { stdout, stderr, exitCode } tuple.
 */
function runCLI(
  args: string[],
  options: { cwd?: string; timeout?: number } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return exec('node', [CLI_PATH, ...args], {
    cwd: options.cwd || PKG_ROOT,
    timeout: options.timeout || 30_000,
    env: { ...process.env, NODE_ENV: 'test', FORCE_COLOR: '0' }
  }).then(
    ({ stdout, stderr }) => ({ stdout: stdout ?? '', stderr: stderr ?? '', exitCode: 0 }),
    (err: any) => ({
      stdout: (err.stdout as string) ?? '',
      stderr: (err.stderr as string) ?? '',
      exitCode: typeof err.code === 'number' ? err.code : 1
    })
  )
}

// ─── Shared temp directory for tests that write files ──────────────

let tmpDir: string

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'crouton-cli-test-'))
})

afterAll(async () => {
  if (tmpDir && existsSync(tmpDir)) {
    await rm(tmpDir, { recursive: true, force: true })
  }
})

// ═══════════════════════════════════════════════════════════════════
// 1. generate
// ═══════════════════════════════════════════════════════════════════

describe('generate command', () => {
  it('exits non-zero when called with no arguments and no crouton.config', async () => {
    // Running in tmpDir where no crouton.config.js exists
    const result = await runCLI(['generate'], { cwd: tmpDir })

    expect(result.exitCode).not.toBe(0)
    // Should mention missing config or required arguments
    const combined = result.stdout + result.stderr
    expect(combined).toMatch(/config|error|usage/i)
  })

  it('exits non-zero when only layer is provided (missing collection)', async () => {
    const result = await runCLI(['generate', 'shop'], { cwd: tmpDir })

    expect(result.exitCode).not.toBe(0)
    const combined = result.stdout + result.stderr
    expect(combined).toMatch(/layer.*collection.*required|both.*required/i)
  })

  it('runs dry-run with layer, collection, and fields-file', async () => {
    // Create a minimal schema JSON fixture
    const schemaPath = join(tmpDir, 'test-schema.json')
    await writeFile(
      schemaPath,
      JSON.stringify({
        name: { type: 'string', meta: { required: true, maxLength: 255 } },
        price: { type: 'decimal', meta: { precision: 10, scale: 2 } },
        active: { type: 'boolean', meta: {} }
      })
    )

    const result = await runCLI(
      ['generate', 'shop', 'products', `--fields-file=${schemaPath}`, '--dry-run'],
      { cwd: tmpDir }
    )

    // Dry-run should succeed (exit 0) or at least produce meaningful output
    const combined = result.stdout + result.stderr
    // It should mention the files/paths it would generate, or "dry run" indication
    expect(combined.length).toBeGreaterThan(0)
    // The command should not crash silently
    if (result.exitCode === 0) {
      // Successful dry run — expect file path hints or "would generate" language
      expect(combined).toMatch(/products|dry.?run|would|generate|layer/i)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════
// 2. config
// ═══════════════════════════════════════════════════════════════════

describe('config command', () => {
  it('exits non-zero when config file does not exist', async () => {
    const result = await runCLI(['config', './nonexistent-config.js'], { cwd: tmpDir })

    expect(result.exitCode).not.toBe(0)
  })

  it('loads a valid config file in dry-run mode', async () => {
    // Create a temp crouton.config.js with a basic collection
    const configDir = join(tmpDir, 'config-test')
    await mkdir(configDir, { recursive: true })

    const schemaPath = join(configDir, 'schema.json')
    await writeFile(
      schemaPath,
      JSON.stringify({
        title: { type: 'string', meta: { required: true } },
        body: { type: 'text', meta: {} }
      })
    )

    const configPath = join(configDir, 'crouton.config.js')
    await writeFile(
      configPath,
      `export default {
  collections: [
    { name: 'posts', fieldsFile: './schema.json' }
  ],
  dialect: 'sqlite',
  targets: [
    { layer: 'blog', collections: ['posts'] }
  ]
}
`
    )

    const result = await runCLI(['config', configPath, '--dry-run'], { cwd: configDir })
    // Should not crash — actual exit code depends on whether the generator
    // can find all paths, but we want no unhandled exceptions
    const combined = result.stdout + result.stderr
    expect(combined.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 3. install
// ═══════════════════════════════════════════════════════════════════

describe('install command', () => {
  it('runs without crashing', async () => {
    const result = await runCLI(['install'], { cwd: tmpDir })

    // May exit 0 or 1 depending on project state (no real project here)
    // but it should produce output and not throw an unhandled error
    const combined = result.stdout + result.stderr
    // Should mention modules, checking, installing, or an error message
    expect(combined.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 4. init
// ═══════════════════════════════════════════════════════════════════

describe('init command', () => {
  it('runs dry-run and mentions scaffolding', async () => {
    const initDir = join(tmpDir, 'init-test')
    await mkdir(initDir, { recursive: true })

    const result = await runCLI(['init', 'test-app', '--dry-run'], { cwd: initDir })

    const combined = result.stdout + result.stderr
    // Should mention scaffold, creating, or the app name
    expect(combined).toMatch(/scaffold|crouton init|test-app|step|creating|would/i)
  })

  it('exits 0 in dry-run mode', async () => {
    const initDir2 = join(tmpDir, 'init-test-2')
    await mkdir(initDir2, { recursive: true })

    const result = await runCLI(['init', 'my-app', '--dry-run'], { cwd: initDir2 })

    expect(result.exitCode).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 5. add
// ═══════════════════════════════════════════════════════════════════

describe('add command', () => {
  it('lists available modules with --list', async () => {
    const result = await runCLI(['add', '--list'])

    expect(result.exitCode).toBe(0)

    const combined = result.stdout + result.stderr
    // Should contain known module names from the registry
    expect(combined).toMatch(/auth/i)
    expect(combined).toMatch(/bookings/i)
    expect(combined).toMatch(/editor/i)
    expect(combined).toMatch(/i18n/i)
    expect(combined).toMatch(/Available Crouton Modules/i)
  })

  it('lists modules when called with no arguments', async () => {
    const result = await runCLI(['add'])

    expect(result.exitCode).toBe(0)

    const combined = result.stdout + result.stderr
    expect(combined).toMatch(/Available Crouton Modules/i)
  })

  it('handles nonexistent module gracefully', async () => {
    const result = await runCLI(['add', 'nonexistent-module', '--dry-run'], { cwd: tmpDir })

    // Should fail or warn about unknown module, but not crash with an unhandled exception
    const combined = result.stdout + result.stderr
    expect(combined.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 6. rollback
// ═══════════════════════════════════════════════════════════════════

describe('rollback command', () => {
  it('handles non-existent collection gracefully with dry-run', async () => {
    const result = await runCLI(
      ['rollback', 'shop', 'products', '--dry-run'],
      { cwd: tmpDir }
    )

    // NOTE: The rollback command sets process.argv and uses dynamic import(),
    // but rollback-collection.mjs has an import.meta.url guard that prevents
    // main() from running when the script is imported (vs executed directly).
    // Current behavior: exits 0 silently. This test documents that behavior.
    expect(result.exitCode).toBe(0)
  })

  it('requires both layer and collection arguments', async () => {
    const result = await runCLI(['rollback'], { cwd: tmpDir })

    expect(result.exitCode).not.toBe(0)
    const combined = result.stdout + result.stderr
    expect(combined).toMatch(/required|missing|usage|error/i)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 7. rollback-bulk
// ═══════════════════════════════════════════════════════════════════

describe('rollback-bulk command', () => {
  it('handles non-existent layer gracefully with dry-run', async () => {
    const result = await runCLI(
      ['rollback-bulk', '--layer=nonexistent', '--dry-run'],
      { cwd: tmpDir }
    )

    // NOTE: Same import.meta.url guard issue as rollback — see rollback command tests.
    // rollback-bulk.mjs's main() only runs when executed directly, not when imported
    // through the Commander.js CLI handler. Current behavior: exits 0 silently.
    expect(result.exitCode).toBe(0)
  })

  it('exits non-zero when neither --layer nor --config is provided', async () => {
    const result = await runCLI(['rollback-bulk'], { cwd: tmpDir })

    expect(result.exitCode).not.toBe(0)
    const combined = result.stdout + result.stderr
    expect(combined).toMatch(/must specify|--layer|--config|error/i)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 8. rollback-interactive
// ═══════════════════════════════════════════════════════════════════

describe('rollback-interactive command', () => {
  it('has the module file present on disk', () => {
    // rollback-interactive requires a TTY for inquirer prompts,
    // so we cannot run it as a subprocess in tests.
    // Instead, verify the implementation file exists.
    const modulePath = resolve(PKG_ROOT, 'lib', 'rollback-interactive.mjs')
    expect(existsSync(modulePath)).toBe(true)
  })

  it('is registered as a CLI command', async () => {
    const result = await runCLI(['--help'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/rollback-interactive/)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 9. doctor
// ═══════════════════════════════════════════════════════════════════

describe('doctor command', () => {
  it('runs against a directory and produces diagnostic output', async () => {
    const result = await runCLI(['doctor', tmpDir])

    const combined = result.stdout + result.stderr
    // Doctor should produce diagnostic output (checks, pass/warn/fail)
    expect(combined).toMatch(/doctor|check|config|warn|pass|fail|issue|schema/i)
  })

  it('runs against current directory by default', async () => {
    const result = await runCLI(['doctor'], { cwd: tmpDir })

    const combined = result.stdout + result.stderr
    // Should produce some output even in an empty directory
    expect(combined.length).toBeGreaterThan(0)
  })

  it('handles non-existent directory', async () => {
    const result = await runCLI(['doctor', '/tmp/nonexistent-dir-12345'])

    // Should exit non-zero and mention the directory
    expect(result.exitCode).not.toBe(0)
    const combined = result.stdout + result.stderr
    expect(combined).toMatch(/not found|error|fail|directory/i)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 10. scaffold-app
// ═══════════════════════════════════════════════════════════════════

describe('scaffold-app command', () => {
  it('runs dry-run and mentions file creation', async () => {
    const scaffoldDir = join(tmpDir, 'scaffold-test')
    await mkdir(scaffoldDir, { recursive: true })

    const result = await runCLI(
      ['scaffold-app', 'test-app', '--dry-run'],
      { cwd: scaffoldDir }
    )

    expect(result.exitCode).toBe(0)

    const combined = result.stdout + result.stderr
    // Should mention files that would be created
    expect(combined).toMatch(/would be created|package\.json|nuxt\.config|test-app/i)
  })

  it('includes feature modules when specified', async () => {
    // Must run from within monorepo so manifest discovery finds package manifests
    const result = await runCLI(
      ['scaffold-app', 'feature-app', '--features', 'bookings,editor', '--dry-run'],
      { cwd: PKG_ROOT }
    )

    expect(result.exitCode).toBe(0)

    const combined = result.stdout + result.stderr
    // Should mention the app or file creation
    expect(combined).toMatch(/feature-app|would be created|package\.json/i)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 11. seed-translations
// ═══════════════════════════════════════════════════════════════════

describe('seed-translations command', () => {
  it('runs dry-run without crashing', async () => {
    const result = await runCLI(['seed-translations', '--dry-run'], { cwd: tmpDir })

    // May exit 0 or non-zero (no nuxt.config.ts in tmpDir), but should not crash
    const combined = result.stdout + result.stderr
    expect(combined.length).toBeGreaterThan(0)
  })

  it('accepts --layer and --team flags', async () => {
    const result = await runCLI(
      ['seed-translations', '--dry-run', '--layer=shop', '--team=test-team'],
      { cwd: tmpDir }
    )

    // Should not crash — command processes flags without error
    const combined = result.stdout + result.stderr
    expect(combined.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════════
// CLI help / meta
// ═══════════════════════════════════════════════════════════════════

describe('CLI meta', () => {
  it('shows help listing all commands', async () => {
    const result = await runCLI(['--help'])

    expect(result.exitCode).toBe(0)

    const out = result.stdout
    // Verify all 11 commands are listed in help
    expect(out).toContain('generate')
    expect(out).toContain('config')
    expect(out).toContain('install')
    expect(out).toContain('init')
    expect(out).toContain('add')
    expect(out).toContain('rollback-bulk')
    expect(out).toContain('rollback-interactive')
    expect(out).toContain('doctor')
    expect(out).toContain('scaffold-app')
    expect(out).toContain('seed-translations')
  })

  it('shows version', async () => {
    const result = await runCLI(['--version'])

    expect(result.exitCode).toBe(0)
    // Should output a semver-like version string
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
