# Briefing: `crouton add <module>` CLI Command

## Overview

Implement a CLI command that automates the full module installation flow, reducing the current 5-step manual process to a single command.

**Target UX:**
```bash
crouton add bookings
# or
crouton add i18n
```

## Problem Statement

### Current Flow (Manual - 5 Steps)
```bash
# 1. Install package
pnpm add @fyit/crouton-bookings

# 2. Edit nuxt.config.ts - add to extends array
# 3. Edit server/db/schema.ts - add schema exports
# 4. Generate migrations
npx nuxt db:generate

# 5. Apply migrations
npx nuxt db:migrate
```

### Pain Points
- Easy to forget steps (especially schema registration)
- Results in cryptic 500 errors when tables don't exist
- Requires knowledge of internal package structure
- No validation that everything worked

## Proposed Solution

### Command Interface

```bash
# Short alias (preferred)
crouton add bookings

# Full package name (also supported)
crouton add @fyit/crouton-bookings

# Multiple modules
crouton add bookings i18n

# Flags
crouton add bookings --skip-migrations  # Don't run migrations
crouton add bookings --dry-run          # Show what would be done
```

### Module Registry

Map short aliases to full package info:

```javascript
// lib/module-registry.mjs
export const MODULES = {
  bookings: {
    package: '@fyit/crouton-bookings',
    schemaExport: '@fyit/crouton-bookings/server/database/schema',
    description: 'Booking system with locations and time slots',
    tables: ['bookings_bookings', 'bookings_locations', 'bookings_settings']
  },
  i18n: {
    package: '@fyit/crouton-i18n',
    schemaExport: '@fyit/crouton-i18n/server/database/schema',
    description: 'Multi-language translations',
    tables: ['translations_ui']
  },
  auth: {
    package: '@fyit/crouton-auth',
    schemaExport: '@fyit/crouton-auth/server/database/schema/auth',
    description: 'Better Auth integration',
    tables: ['user', 'session', 'account', 'organization', 'member', '...']
  },
  editor: {
    package: '@fyit/crouton-editor',
    schemaExport: null, // No database tables
    description: 'Rich text editor'
  },
  assets: {
    package: '@fyit/crouton-assets',
    schemaExport: '@fyit/crouton-assets/server/database/schema',
    description: 'File uploads and image management',
    tables: ['assets']
  }
}
```

### Implementation Steps

The command should execute these steps in order:

```
┌─────────────────────────────────────────────────────────────┐
│ crouton add bookings                                        │
├─────────────────────────────────────────────────────────────┤
│ 1. Validate                                                 │
│    ├─ Check module exists in registry                       │
│    ├─ Check not already installed                           │
│    └─ Detect package manager (pnpm/npm/yarn)                │
├─────────────────────────────────────────────────────────────┤
│ 2. Install Package                                          │
│    └─ pnpm add @fyit/crouton-bookings           │
├─────────────────────────────────────────────────────────────┤
│ 3. Update nuxt.config.ts                                    │
│    ├─ Parse existing config                                 │
│    ├─ Add to extends array (preserve order)                 │
│    └─ Write back with formatting                            │
├─────────────────────────────────────────────────────────────┤
│ 4. Update server/db/schema.ts                               │
│    ├─ Read existing file                                    │
│    ├─ Add export statement                                  │
│    └─ Write back                                            │
├─────────────────────────────────────────────────────────────┤
│ 5. Generate & Apply Migrations                              │
│    ├─ npx nuxt db:generate                                  │
│    └─ npx nuxt db:migrate                                   │
├─────────────────────────────────────────────────────────────┤
│ 6. Verify & Report                                          │
│    ├─ Check tables exist in database                        │
│    └─ Print success message with next steps                 │
└─────────────────────────────────────────────────────────────┘
```

## Technical Design

### File Location
```
packages/nuxt-crouton-cli/
├── bin/crouton-generate.js      # Add 'add' command here
├── lib/
│   ├── module-registry.mjs      # Module definitions (NEW)
│   ├── add-module.mjs           # Main implementation (NEW)
│   └── utils/
│       ├── detect-package-manager.mjs
│       ├── update-nuxt-config.mjs
│       └── update-schema-index.mjs
```

### Key Functions

#### 1. Update nuxt.config.ts

```javascript
// lib/utils/update-nuxt-config.mjs
import { parse } from 'recast'
import { print } from 'recast'

export async function addToNuxtConfigExtends(configPath, packageName) {
  const source = await fs.readFile(configPath, 'utf-8')
  const ast = parse(source, { parser: require('recast/parsers/typescript') })

  // Find extends array in defineNuxtConfig call
  // Add packageName if not present
  // Preserve formatting and comments

  const output = print(ast).code
  await fs.writeFile(configPath, output)
}
```

#### 2. Update schema index

```javascript
// lib/utils/update-schema-index.mjs
export async function addSchemaExport(schemaPath, exportPath) {
  let content = await fs.readFile(schemaPath, 'utf-8')

  const exportLine = `export * from '${exportPath}'`

  // Check if already exists
  if (content.includes(exportPath)) {
    return { added: false, reason: 'already exists' }
  }

  // Add at end of file
  content = content.trimEnd() + '\n' + exportLine + '\n'

  await fs.writeFile(schemaPath, content)
  return { added: true }
}
```

#### 3. Main add flow

```javascript
// lib/add-module.mjs
import { MODULES } from './module-registry.mjs'
import { execSync } from 'child_process'

export async function addModule(moduleName, options = {}) {
  const module = MODULES[moduleName]
  if (!module) {
    throw new Error(`Unknown module: ${moduleName}. Available: ${Object.keys(MODULES).join(', ')}`)
  }

  console.log(`Adding ${module.package}...`)

  // Step 1: Install package
  if (!options.skipInstall) {
    const pm = detectPackageManager()
    execSync(`${pm} add ${module.package}`, { stdio: 'inherit' })
  }

  // Step 2: Update nuxt.config.ts
  await addToNuxtConfigExtends('./nuxt.config.ts', module.package)

  // Step 3: Update schema (if module has tables)
  if (module.schemaExport) {
    await addSchemaExport('./server/db/schema.ts', module.schemaExport)
  }

  // Step 4: Generate & apply migrations
  if (!options.skipMigrations && module.schemaExport) {
    execSync('npx nuxt db:generate', { stdio: 'inherit' })
    execSync('npx nuxt db:migrate', { stdio: 'inherit' })
  }

  // Step 5: Verify
  console.log(`\n✅ ${moduleName} installed successfully!`)
  if (module.tables) {
    console.log(`   Tables created: ${module.tables.join(', ')}`)
  }
}
```

### CLI Integration

```javascript
// bin/crouton-generate.js (add to existing Commander setup)
program
  .command('add <modules...>')
  .description('Add Crouton modules to your project')
  .option('--skip-migrations', 'Skip migration generation and application')
  .option('--skip-install', 'Skip package installation (assume already installed)')
  .option('--dry-run', 'Show what would be done without making changes')
  .action(async (modules, options) => {
    for (const moduleName of modules) {
      await addModule(moduleName, options)
    }
  })
```

## Edge Cases & Error Handling

### Already Installed
```
$ crouton add bookings
⚠️  @fyit/crouton-bookings is already installed.
    Run with --force to reinstall and regenerate migrations.
```

### Missing Dependencies
```
$ crouton add bookings
❌ Error: @fyit/crouton-auth is required but not installed.
   Run: crouton add auth bookings
```

### Schema File Doesn't Exist
```
$ crouton add bookings
⚠️  server/db/schema.ts not found.
   Creating with default content...
```

### Migration Conflicts
```
$ crouton add bookings
⚠️  Migrations generated but some tables already exist.
   You may need to manually reconcile migration files.
```

## Success Output

```
$ crouton add bookings

📦 Installing @fyit/crouton-bookings...
   ✓ Package installed

📝 Updating nuxt.config.ts...
   ✓ Added to extends array

📝 Updating server/db/schema.ts...
   ✓ Added schema export

🗄️  Generating migrations...
   ✓ Created 0004_add_bookings.sql

🗄️  Applying migrations...
   ✓ Tables created: bookings_bookings, bookings_locations, bookings_settings

✅ bookings module installed successfully!

Next steps:
  • Restart your dev server: pnpm dev
  • View bookings components: <CroutonBookings* />
  • API routes available at: /api/bookings/*
```

## Dependencies

### Required
- `recast` - AST parsing/manipulation for nuxt.config.ts
- `commander` - Already used for CLI

### Optional
- `picocolors` - Terminal colors (already in use)
- `ora` - Spinners for long operations

## Testing Strategy

```javascript
// tests/add-module.test.js
describe('crouton add', () => {
  it('adds module to empty project', async () => {
    // Setup temp project
    // Run crouton add bookings
    // Verify nuxt.config.ts updated
    // Verify schema.ts updated
    // Verify migrations generated
  })

  it('handles already installed module', async () => {
    // Pre-install module
    // Run crouton add bookings
    // Verify warning shown
  })

  it('supports --dry-run flag', async () => {
    // Run crouton add bookings --dry-run
    // Verify no files changed
    // Verify output shows what would happen
  })
})
```

## Implementation Phases

### Phase 1: Core Flow (MVP)
- [ ] Module registry with 3 modules (bookings, i18n, auth)
- [ ] Basic add command
- [ ] Update nuxt.config.ts (simple append)
- [ ] Update schema.ts (simple append)
- [ ] Run migrations

### Phase 2: Robustness
- [ ] AST-based nuxt.config.ts modification
- [ ] Idempotency checks
- [ ] Dependency resolution (auth before bookings)
- [ ] Better error messages

### Phase 3: Polish
- [ ] `--dry-run` flag
- [ ] Multiple modules in one command
- [ ] Interactive mode with prompts
- [ ] Undo/rollback support

## Open Questions

1. **Should we support `crouton remove <module>`?**
   - Would need to: uninstall package, remove from extends, remove schema export
   - Migrations can't be "unapplied" easily

2. **How to handle version conflicts?**
   - Module A requires auth@1.x, Module B requires auth@2.x

3. **Should we verify the project is a valid Crouton app first?**
   - Check for nuxt-crouton in extends before allowing other modules

## Related Files

- `/packages/nuxt-crouton-cli/bin/crouton-generate.js` - CLI entry
- `/packages/nuxt-crouton-cli/lib/install-modules.mjs` - Existing install logic
- `/apps/docs/content/1.getting-started/4.adding-modules.md` - User documentation

---

*Briefing created: 2026-01-07*
*Status: Ready for implementation*
