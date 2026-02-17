# Plan: CLI unjs Modernization

## Overview

Incrementally replace the crouton CLI's third-party dependencies with unjs ecosystem packages to align with Nuxt conventions. This is **not** a rewrite — it's a progressive migration that piggybacks on the manifest-driven architecture work (see `manifest-driven-architecture.md`).

**Target**: Merge this plan into a combined `cli-and-manifests.md` plan — both plans share the same timeline, phases, and files.

## Decisions

| Decision | Answer | Rationale |
|----------|--------|-----------|
| c12 config loading | Full discovery (like nuxt.config) | Auto-discover `.ts`/`.js`/`.mjs`, env overrides, layer merging — same DX as Nuxt |
| chalk/ora cleanup | Full cleanup in Wave 3 | All remaining chalk/ora imports migrated in Wave 3, deps removed entirely. Clean break. |
| inquirer scope | Only `rollback-interactive.mjs` | Audit shows only 1 file imports inquirer (not 3 as originally estimated) |
| Test strategy | Test-first, both phases | Phase A: characterization tests for all 11 current commands. Phase B: citty-specific tests replace them. |
| Test coverage | All 11 CLI commands | generate, config, install, init, add, rollback, rollback-bulk, rollback-interactive, doctor, scaffold-app, seed-translations |
| Wave 1 timing | Bundle with manifest Phase 1 | Deps only become useful when `.ts` manifests exist to load |
| Plan merge | Combined `cli-and-manifests.md` | Both plans share timeline/phases/files — maintaining two docs creates drift |

## Current State

**Package**: `packages/crouton-cli`
**Entry point**: `bin/crouton-generate.js`
**File format**: All `.mjs` (ES modules, no TypeScript)
**Orchestrator**: `lib/generate-collection.mjs` (~80KB, calls 13 generators)

### Current Dependencies

| Package | Version | Purpose | Replacement |
|---------|---------|---------|-------------|
| `commander` | ^11.1.0 | CLI arg parsing + subcommands | `citty` |
| `chalk` | ^5.3.0 | Terminal colors | `consola` |
| `ora` | ^8.0.1 | Terminal spinners | `consola` |
| `inquirer` | ^9.2.12 | Interactive prompts | `consola` / `@clack/prompts` |
| `fs-extra` | ^11.2.0 | File I/O (readJson, copy) | Node `fs/promises` + `pkg-types` |
| `drizzle-seed` | ^0.3.1 | Faker data for seeding | **Keep** (no unjs equivalent) |

### Current Patterns (What Changes)

**Arg parsing** — Dual system: Commander for subcommand routing, manual `process.argv.includes()` inside generators. Inconsistent and error-prone.

**Config loading** — Manual file extension scanning in `lib/utils/config-builder.mjs`. Only supports `.js`/`.mjs`/`.cjs`/`.ts` via custom detection. No TypeScript config support for users.

**Logging** — Mix of `chalk` (colors), `ora` (spinners), and raw `console.log`. Three deps doing one job.

**File I/O** — `fs-extra` used mainly for `readJson()` and `copy()`. Both replaceable with Node built-ins (Node 16+).

**Path handling** — Raw `path.resolve()` / `path.join()` everywhere. Works but not cross-platform safe.

---

## Target State

| Concern | unjs Package | What It Does |
|---------|-------------|-------------|
| CLI framework | **citty** | Typed args, subcommands, auto-help (powers `nuxi`) |
| Config loading | **c12** | Auto-discovers `crouton.config.ts` (powers `nuxt.config.ts` loading) |
| TS imports | **jiti** | Import `.ts` files from `.mjs` context (manifest loading) |
| Logging | **consola** | Colors, spinners, log levels, prompts — replaces chalk + ora |
| Interactive prompts | **@clack/prompts** | Beautiful CLI prompts (powers `nuxi init`) |
| Deep merge | **defu** | Config defaults merging |
| Paths | **pathe** | Cross-platform path utilities |
| Package reading | **pkg-types** | Safe `readPackageJSON()`, `resolvePackageJSON()` |
| Keep | **drizzle-seed** | No replacement needed |

### Dependency Delta

**Remove** (5): `commander`, `chalk`, `ora`, `inquirer`, `fs-extra`
**Add** (8): `citty`, `c12`, `jiti`, `consola`, `@clack/prompts`, `defu`, `pathe`, `pkg-types`

Net: -5 bespoke deps, +8 unjs deps. The unjs deps are already transitive dependencies of Nuxt, so this adds near-zero weight in monorepo context.

---

## Migration Strategy

**Principle**: Migrate in the files you're already touching. Don't refactor untouched generators for the sake of it.

### Wave 1: Foundation (Ships with Manifest Phase 1-2)

These packages are required for the manifest loader anyway. Add them first.

#### 1.1 Add jiti

**Why now**: Manifest loader needs to import `.ts` manifest files from `.mjs` CLI code.
**Files touched**: New `lib/utils/manifest-loader.mjs`
**Pattern**:
```javascript
import { createJiti } from 'jiti'
const jiti = createJiti(import.meta.url)
const manifest = await jiti.import('./crouton.manifest.ts')
```

#### 1.2 Add c12 (full discovery mode)

**Why now**: Manifest loader needs to discover project config. Replace the manual extension scanning in `config-builder.mjs`.
**Files touched**: `lib/utils/config-builder.mjs`, new `lib/utils/manifest-loader.mjs`
**Discovery mode**: Full c12 discovery (like nuxt.config) — auto-discovers `.ts`/`.js`/`.mjs`/`.cjs`, supports `CROUTON_*` environment overrides, and layer merging.
**Pattern**:
```javascript
import { loadConfig } from 'c12'

// Replaces 20+ lines of manual extension detection
// Full discovery: finds crouton.config.{ts,js,mjs,cjs}, reads CROUTON_* env vars
const { config } = await loadConfig({
  name: 'crouton',
  cwd: process.cwd(),
  defaults: {
    dialect: 'sqlite',
    features: {}
  }
})
```
**Unlocks**: Users can write `crouton.config.ts` with full TypeScript + IDE autocomplete. Environment variables like `CROUTON_DIALECT=pg` work automatically.

#### 1.3 Add defu

**Why now**: Config merging (manifest defaults + user overrides).
**Files touched**: `lib/utils/config-builder.mjs`, `lib/utils/manifest-loader.mjs`
**Pattern**:
```javascript
import { defu } from 'defu'
const config = defu(userConfig, manifestDefaults)
```

#### 1.4 Add pathe + pkg-types

**Why now**: Manifest discovery scans directories and reads package.json files.
**Files touched**: New `lib/utils/manifest-loader.mjs`
**Pattern**:
```javascript
import { resolve, join } from 'pathe'
import { readPackageJSON } from 'pkg-types'

const pkg = await readPackageJSON(resolve(packageDir))
```

#### 1.1–1.4 Checklist
- [ ] Add `jiti`, `c12`, `defu`, `pathe`, `pkg-types` to `packages/crouton-cli/package.json`
- [ ] Replace config detection in `config-builder.mjs` with `c12`
- [ ] Use `pathe` and `pkg-types` in new manifest-loader
- [ ] Verify: `pnpm crouton generate` still works (no behavioral change)
- [ ] Verify: `crouton.config.ts` works as user config format

---

### Wave 2: Logging (Ships with Manifest Phase 2+3)

The manifest work edits `helpers.mjs`, `manifest-merge.mjs`, `module-registry.mjs`, and the main orchestrator. Swap logging in those files.

#### 2.1 Add consola, remove chalk + ora

**Files touched**: Every file modified by manifest Phase 2+3 (don't touch untouched generators).
**Pattern**:
```javascript
// Before (chalk + ora)
import chalk from 'chalk'
import ora from 'ora'
const spinner = ora('Generating collection...').start()
console.log(chalk.green('✓ Created schema'))
spinner.succeed('Done')
spinner.fail('Generation failed')

// After (consola)
import { consola } from 'consola'
consola.start('Generating collection...')
consola.success('Created schema')
consola.success('Done')
consola.error('Generation failed')
```

**Migration rules**:
- `chalk.green('✓ ...')` → `consola.success('...')`
- `chalk.yellow('⚠ ...')` → `consola.warn('...')`
- `chalk.red('...')` → `consola.error('...')`
- `chalk.cyan('...')` → `consola.info('...')`
- `chalk.gray('...')` → `consola.log('...')`
- `ora('...').start()` → `consola.start('...')`
- `spinner.succeed('...')` → `consola.success('...')`
- `spinner.fail('...')` → `consola.error('...')`
- `spinner.warn('...')` → `consola.warn('...')`

**Do NOT migrate in Wave 2**: Generator files and command files not touched by manifest work. These are migrated in **Wave 3** (full chalk/ora cleanup).

**Intermediate state after Wave 2** — chalk/ora still imported in these files (cleaned up in Wave 3):
- `bin/crouton-generate.js` — rewritten entirely in Wave 3
- `lib/add-events.mjs`
- `lib/add-module.mjs`
- `lib/doctor.mjs`
- `lib/init-app.mjs`
- `lib/rollback-bulk.mjs`
- `lib/rollback-collection.mjs`
- `lib/rollback-interactive.mjs`
- `lib/scaffold-app.mjs`
- `lib/seed-translations.mjs`

#### 2.1 Checklist
- [ ] Add `consola` to `packages/crouton-cli/package.json`
- [ ] Replace chalk + ora in files modified by manifest work
- [ ] Keep `chalk` and `ora` in package.json (still used by ~10 files until Wave 3)
- [ ] Verify: CLI output is equivalent (colors, spinners, error messages)

---

### Wave 3: CLI Framework + Full Cleanup (Separate PR, after manifests land)

This is the largest change — it touches every command definition, migrates all remaining chalk/ora imports, and replaces inquirer. Do it as a dedicated PR, not mixed with manifest work.

**Approach: Test-first.** Before rewriting anything, write characterization tests for all 11 current commands. Then rewrite with citty and verify tests still pass. Finally, replace characterization tests with citty-specific tests.

#### 3.0 Characterization tests (BEFORE rewriting)

Write tests for all 11 CLI commands against the **current** Commander-based implementation. These act as a safety net during the rewrite.

**Test file**: `packages/crouton-cli/__tests__/commands.test.mjs`

**Commands to test**:
1. `generate` — generates collection files (test with `--dry-run`)
2. `config` — loads and displays config
3. `install` — installs required modules
4. `init` — full pipeline (scaffold → generate → doctor)
5. `add` — adds modules/features
6. `rollback` — removes a single collection
7. `rollback-bulk` — removes multiple collections or entire layer
8. `rollback-interactive` — interactive removal UI
9. `doctor` — validates existing app
10. `scaffold-app` — creates boilerplate structure
11. `seed-translations` — imports i18n JSON to database

**Test pattern**: Run each command as a subprocess, assert on exit code and stdout patterns. Use temp directories for file generation tests.

After citty rewrite is complete, replace these with citty-specific unit tests that test `defineCommand()` handlers directly (no subprocess needed).

#### 3.1 Replace Commander with citty

**Files touched**: `bin/crouton-generate.js` (entry point), every command file
**Pattern**:
```javascript
// Before (Commander)
import { program } from 'commander'
program
  .command('generate <layer> [collection]')
  .option('-c, --config <path>', 'Config file')
  .option('--dry-run', 'Preview')
  .option('--force', 'Overwrite')
  .action(async (layer, collection, options) => { ... })

// After (citty)
import { defineCommand, runMain } from 'citty'

const generate = defineCommand({
  meta: { name: 'generate', description: 'Generate a CRUD collection' },
  args: {
    layer: { type: 'positional', description: 'Target layer', required: true },
    collection: { type: 'positional', description: 'Collection name' },
    config: { type: 'string', alias: 'c', description: 'Config file path' },
    dryRun: { type: 'boolean', description: 'Preview without writing' },
    force: { type: 'boolean', description: 'Overwrite existing files' },
    dialect: { type: 'string', description: 'Database dialect (sqlite|pg)' },
    hierarchy: { type: 'boolean', description: 'Enable tree structure' },
    seed: { type: 'boolean', description: 'Generate seed data' },
    count: { type: 'string', description: 'Seed row count' },
    noTranslations: { type: 'boolean', description: 'Skip i18n support' },
    autoRelations: { type: 'boolean', description: 'Add relation stubs' },
  },
  async run({ args }) {
    // args is fully typed — no more process.argv.includes()
  }
})

const main = defineCommand({
  meta: { name: 'crouton', version: '1.0.0' },
  subCommands: { generate, config, install, init, add, doctor, rollback, seed: seedTranslations }
})

runMain(main)
```

#### 3.2 Remove manual process.argv parsing

**Files touched**: `lib/generate-collection.mjs`, any generator that reads `process.argv` directly.
**What changes**: The `parseArgs()` function in `generate-collection.mjs` is deleted. Args come from citty's typed `args` object, passed down to generators as an options parameter.

```javascript
// Before: generators read process.argv themselves
function parseArgs() {
  const a = process.argv.slice(2)
  const dryRun = a.includes('--dry-run')
  const config = (a.find(x => x.startsWith('--config=')) || '').split('=')[1]
  return { dryRun, config }
}

// After: args passed as typed parameter
export async function generateFormComponent(fields, collection, layer, args) {
  const { dryRun, dialect, noTranslations } = args
  // ...
}
```

#### 3.3 Replace inquirer with @clack/prompts

**Files touched**: `lib/rollback-interactive.mjs` (only file importing inquirer)
**Pattern**:
```javascript
// Before (inquirer)
import inquirer from 'inquirer'
const { layer } = await inquirer.prompt([{
  type: 'list',
  name: 'layer',
  message: 'Which layer?',
  choices: layers
}])

// After (@clack/prompts)
import { select, confirm, text, intro, outro, spinner } from '@clack/prompts'

intro('Create a new collection')
const layer = await select({
  message: 'Which layer?',
  options: layers.map(l => ({ value: l, label: l }))
})
const shouldSeed = await confirm({ message: 'Generate seed data?' })
outro('Collection created!')
```

#### 3.4 Remove fs-extra

**Files touched**: Any file importing `fs-extra`
**Pattern**:
```javascript
// Before (fs-extra)
import fs from 'fs-extra'
const pkg = await fs.readJson(join(cwd, 'package.json'))
await fs.copy(src, dest)

// After (Node built-ins + pkg-types)
import { readFile, cp, mkdir, writeFile } from 'node:fs/promises'
import { readPackageJSON } from 'pkg-types'

const pkg = await readPackageJSON(cwd)
await cp(src, dest, { recursive: true }) // Node 16.7+
```

#### Wave 3 Checklist

**Phase A: Characterization tests (before rewrite)**
- [ ] Create `packages/crouton-cli/__tests__/commands.test.mjs`
- [ ] Write characterization tests for all 11 commands
- [ ] Verify all tests pass against current Commander-based CLI

**Phase B: Rewrite + full cleanup**
- [ ] Add `citty` and `@clack/prompts` to package.json
- [ ] Rewrite `bin/crouton-generate.js` with citty
- [ ] Rewrite each command as `defineCommand()`
- [ ] Delete `parseArgs()` from `generate-collection.mjs`
- [ ] Pass typed args to generators as parameter (not process.argv)
- [ ] Replace inquirer in `rollback-interactive.mjs` with @clack/prompts
- [ ] Replace fs-extra with Node built-ins + pkg-types in all 9 files
- [ ] Migrate ALL remaining chalk/ora imports to consola (~10 files)
- [ ] Remove `commander`, `chalk`, `ora`, `inquirer`, `fs-extra` from package.json
- [ ] Verify characterization tests still pass
- [ ] Verify all 11 commands work: `generate`, `config`, `install`, `init`, `add`, `rollback`, `rollback-bulk`, `rollback-interactive`, `doctor`, `scaffold-app`, `seed-translations`
- [ ] Verify: `--help` auto-generated by citty

**Phase C: Replace tests**
- [ ] Replace characterization (subprocess) tests with citty-specific unit tests
- [ ] Test `defineCommand()` handlers directly (no subprocess)

---

### Wave 4: TypeScript Migration (Future, Optional)

With jiti already in place, the CLI can progressively migrate from `.mjs` to `.ts`. This is opportunistic — rename files as they're touched for other reasons.

**Priority order** (most-touched files first):
1. `lib/utils/helpers.mjs` → `.ts`
2. `lib/utils/config-builder.mjs` → `.ts`
3. `lib/utils/manifest-loader.mjs` → already `.mjs` but could be `.ts`
4. `lib/utils/manifest-merge.mjs` → `.ts`
5. `lib/generate-collection.mjs` → `.ts`
6. Generator files (13 files) → `.ts` when modified

**Build consideration**: Once enough files are `.ts`, consider adding `unbuild` for a proper build step. Until then, jiti handles the `.ts` → runtime bridge.

---

## Coordination with Manifest Plan

| Manifest Phase | CLI Modernization Wave | Shared Files | PR |
|---------------|----------------------|-------------|-----|
| Phase 1 | Wave 1 (foundation) | New manifest-loader, config-builder | PR 1 |
| Phase 2+3 (atomic) | Wave 2 (logging) | helpers.mjs, manifest-merge.mjs, module-registry.mjs | PR 2 |
| After manifests | Wave 3 (CLI framework + full cleanup) | bin/crouton-generate.js, all commands, all remaining chalk/ora files | PR 3 |
| Ongoing | Wave 4 (TypeScript) | Any file being modified | Opportunistic |

**Rule**: Waves 1-2 ship inside manifest PRs. Wave 3 is a standalone test-first PR after manifests land. Wave 4 is opportunistic.

---

## Verification

### After Wave 1
```bash
# Config loading works with c12
pnpm crouton config ./crouton.config.js   # existing .js format
pnpm crouton config ./crouton.config.ts   # NEW: TypeScript config

# Manifest discovery works
pnpm crouton doctor .                     # should detect all manifests
```

### After Wave 2
```bash
# Visual check: CLI output has colors, spinners, success/error messages
pnpm crouton generate shop products --dry-run
pnpm crouton doctor .
# No chalk/ora import errors
```

### After Wave 3
```bash
# All commands work with citty
pnpm crouton --help                       # auto-generated help
pnpm crouton generate --help              # subcommand help
pnpm crouton generate shop products       # normal generation
pnpm crouton init                         # interactive prompts (@clack)
pnpm crouton add auth                     # module installation
pnpm crouton doctor .                     # project validation
pnpm crouton rollback shop products       # cleanup
```

---

## Key Files Reference

| File | Current Role | What Changes |
|------|-------------|-------------|
| `bin/crouton-generate.js` | Entry point, Commander setup | Wave 3: Rewrite with citty |
| `lib/generate-collection.mjs` | Main orchestrator (~80KB) | Wave 2: consola logging. Wave 3: receive typed args |
| `lib/utils/config-builder.mjs` | Manual config detection | Wave 1: Replace with c12 |
| `lib/utils/helpers.mjs` | Type mapping, seed generators | Wave 2: consola logging (manifest work touches this) |
| `lib/utils/manifest-merge.mjs` | Hardcoded package manifests | Wave 2: consola logging (manifest work touches this) |
| `lib/utils/paths.mjs` | PATH_CONFIG template system | Wave 1: Use pathe for joins/resolves |
| `lib/utils/detect-package-manager.mjs` | Lock file scanning | Wave 3: Could use pkg-types |
| `lib/module-registry.mjs` | Module lookup | Wave 2: consola logging (manifest work deletes backing JSON) |
| `lib/init-app.mjs` | Scaffold pipeline | Wave 3: @clack/prompts |
| `lib/scaffold-app.mjs` | App boilerplate | Wave 3: @clack/prompts |
| `lib/add-module.mjs` | Module installer | Wave 3: @clack/prompts |
| `lib/generators/*.mjs` | 13 code generators | Wave 2: consola in touched files. Wave 4: .ts migration |

---

## Scope Summary

| Wave | Effort | Ships With | Deps Added | Deps Removed |
|------|--------|-----------|-----------|-------------|
| Wave 1 | Small | Manifest Phase 1 | jiti, c12, defu, pathe, pkg-types | — |
| Wave 2 | Small | Manifest Phase 2+3 (atomic) | consola | — (chalk/ora kept temporarily) |
| Wave 3 | Large | Standalone PR (test-first) | citty, @clack/prompts | commander, chalk, ora, inquirer, fs-extra (all 5 removed) |
| Wave 4 | Ongoing | Opportunistic | (unbuild, later) | — |

**Total**: Replace 5 deps with 8 unjs-aligned deps. Net result: CLI uses the same stack as Nuxt itself.