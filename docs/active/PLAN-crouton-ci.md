# Crouton CI Package — Build Plan

## One-liner

Developer tooling package for auditing packages, detecting documentation drift, and maintaining docs quality across the monorepo.

---

## Quick Reference

| Item | Value |
|------|-------|
| Package | `@fyit/crouton-ci` |
| Location | `packages/crouton-ci/` |
| Type | CLI tool (Node.js) |
| Dependencies | Commander, glob, gray-matter, simple-git, semver |
| Status | Planning |

### Commands at a Glance

| Command | Purpose | Priority |
|---------|---------|----------|
| `audit <pkg>` | Analyze package documentation completeness | Core |
| `check` | CI-friendly exit codes for doc issues | Core |
| `scaffold <pkg>` | Generate CLAUDE.md/README templates | Core |
| `docs-health` | Check /docs folder for stale content | Core |
| `sync-check` | Verify CLI docs are in sync | Core |
| `changelog <pkg>` | Generate changelog from git commits | High |
| `impact-check` | Cross-reference external dep changes | High |
| `snapshot <pkg>` | Generate/compare API snapshots | Medium |
| `test-examples` | Validate doc code examples compile | Medium |
| `init-hooks` | Set up pre-commit hooks | Low |

---

## The Problem

1. **Documentation drift** — Package code changes but CLAUDE.md/README don't get updated
2. **No visibility** — Hard to know which packages need documentation work
3. **Manual process** — Auditing a package requires reading all files manually
4. **Stale plans** — `/docs` folder has outdated briefings and plans with unclear status
5. **No CI integration** — Documentation quality isn't checked in PRs

---

## Critical Design Principle: Defensive & Human-First

**AI makes mistakes. Humans make fewer mistakes. Human choices always win.**

### Trust Hierarchy

```
1. Human-written content     → PRESERVE, never auto-overwrite
2. Human-approved AI content → Trust, but flag if conflicts arise
3. AI-generated content      → SUSPECT, always require review
```

### Defensive Rules

1. **Never auto-overwrite existing content**
   - Always show diffs
   - Require explicit confirmation
   - Default to "keep existing" when uncertain

2. **Flag, don't fix**
   - When AI detects a "problem" in human-written docs, FLAG it for review
   - Don't assume the docs are wrong - maybe the code is wrong
   - Present both sides: "Docs say X, code does Y - which is correct?"

3. **Preserve provenance**
   - Track what was human-written vs AI-generated
   - Use markers: `<!-- human-written -->` or `<!-- ai-generated: 2024-01-19 -->`
   - When updating, preserve human sections, only touch AI sections

4. **Assume AI mistakes are likely**
   - AI might misread code
   - AI might generate incorrect prop types
   - AI might miss context that humans know
   - Always offer "skip" and "keep existing" options

5. **Require human judgment for conflicts**
   ```
   ⚠️ Conflict detected:

   CLAUDE.md says: "useEditor returns { editor, content }"
   Source code shows: "useEditor returns { editor, html, json }"

   Options:
   1. Update docs to match code
   2. Keep docs (maybe code will change)
   3. Flag for manual review
   4. Skip
   ```

### Implementation Requirements

- `--dry-run` is the default for destructive operations
- `--force` required to actually write files
- Interactive mode asks before each change
- All changes logged with reasoning
- Rollback capability for AI-made changes

### Provenance Tracking

Mark sections in generated docs to track origin:

```markdown
## Package Purpose

<!-- human-written -->
This package provides rich text editing with variable interpolation,
designed specifically for email templates and CMS content.
<!-- /human-written -->

## Components

<!-- ai-generated: 2024-01-19, source: app/components/*.vue -->
| Component | File | Props |
|-----------|------|-------|
| CroutonEditorSimple | Simple.vue | modelValue, placeholder, ... |
<!-- /ai-generated -->

## Common Tasks

<!-- human-written -->
### Setting up email templates
[Human-written guide with context AI wouldn't know]
<!-- /human-written -->
```

**Rules:**
- AI can update `ai-generated` sections freely (with confirmation)
- AI must NEVER modify `human-written` sections without explicit request
- Unmarked sections are treated as human-written (conservative default)
- When scaffolding new docs, mark everything as `ai-generated`

### Conflict Resolution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Conflict: Docs vs Code Mismatch                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Is the doc section human-written?                              │
│  ├── YES → Flag for human review, DO NOT auto-change            │
│  └── NO (ai-generated) → Show diff, ask for confirmation        │
│                                                                 │
│  Human review options:                                          │
│  ├── 1. Update docs to match code                               │
│  ├── 2. Keep docs (code might need to change)                   │
│  ├── 3. Both are valid (document the discrepancy)               │
│  └── 4. Skip for now                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Solution

A CLI tool that:
- Analyzes packages to extract exports, types, and structure
- Compares source code against documentation
- Scaffolds missing documentation
- Checks `/docs` folder health
- Outputs machine-readable reports for CI

---

## CLI Commands

### `crouton-ci audit <package>`

Audit a single package for documentation completeness.

```bash
# Audit a specific package
pnpm crouton-ci audit crouton-editor

# Audit all packages
pnpm crouton-ci audit --all

# Output as JSON (for CI)
pnpm crouton-ci audit crouton-editor --json

# Interactive mode (prompts for missing info)
pnpm crouton-ci audit crouton-editor --interactive
```

**Output (read-only by default):**
```
┌─────────────────────────────────────────────────────────────────┐
│  Auditing: crouton-editor                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Package Info                                                   │
│  ├── Type: addon (Nuxt Layer)                                   │
│  ├── Files: 12                                                  │
│  └── Maturity: stable                                           │
│                                                                 │
│  Exports Found (from source code analysis)                      │
│  ├── Components: 5 (CroutonEditorSimple, Blocks, ...)           │
│  ├── Composables: 1 (useEditorVariables)                        │
│  ├── Server Utils: 0                                            │
│  └── Types: 2 (EditorVariable, EditorVariableGroup)             │
│                                                                 │
│  Documentation Status                                           │
│  ├── CLAUDE.md: ✅ exists (coverage: 95%)                       │
│  │   └── Sections: 3 human-written, 2 ai-generated              │
│  ├── README.md: ✅ exists (coverage: 80%)                       │
│  └── apps/docs: ⚠️  1 page, possibly outdated                   │
│                                                                 │
│  Freshness Score: B (78/100)                                    │
│  ├── Last code change: 3 days ago                               │
│  ├── Last doc change: 12 days ago                               │
│  └── Doc lag: 9 days (acceptable)                               │
│                                                                 │
│  Potential Issues (AI analysis - may be wrong)                  │
│  ├── ⚠️  CroutonEditorToolbar not found in CLAUDE.md            │
│  │   └── Possible reasons: undocumented intentionally, internal │
│  └── ⚠️  "@friendlyinternet" reference found                    │
│      └── Location: ai-generated section (safe to auto-update)   │
│                                                                 │
│  Related /docs Files                                            │
│  └── active/block-editor-debugging-brief.md                     │
│                                                                 │
│  ────────────────────────────────────────────────────────────── │
│  ℹ️  READ-ONLY: No files were modified.                         │
│  Run with --interactive to review and selectively fix issues.   │
└─────────────────────────────────────────────────────────────────┘
```

**Interactive mode (`--interactive`):**
```
┌─────────────────────────────────────────────────────────────────┐
│  Issue 1 of 2: Potential missing documentation                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CroutonEditorToolbar found in source, not in CLAUDE.md         │
│                                                                 │
│  Source: app/components/Toolbar.vue                             │
│  Props detected: editor, handlers, ui                           │
│                                                                 │
│  ⚠️  I might be wrong! This component could be:                 │
│     • Internal/private (not meant for external use)             │
│     • Deprecated (being phased out)                             │
│     • Documented elsewhere under different name                 │
│     • Intentionally undocumented                                │
│                                                                 │
│  What would you like to do?                                     │
│                                                                 │
│  [1] Show me the proposed addition (don't write yet)            │
│  [2] Add to CLAUDE.md (I'll confirm the diff first)             │
│  [3] Skip - it's intentionally undocumented                     │
│  [4] Show me the source file so I can decide                    │
│  [5] Mark as @internal in source code                           │
│                                                                 │
│  Your choice (default: 1 - show proposed): _                    │
└─────────────────────────────────────────────────────────────────┘
```

### `crouton-ci check`

Quick CI check - exits with error code if issues found.

```bash
# Check all packages (for CI)
pnpm crouton-ci check

# Check specific packages
pnpm crouton-ci check crouton-editor crouton-auth

# Strict mode (warnings are errors)
pnpm crouton-ci check --strict

# Output JSON report
pnpm crouton-ci check --json > docs-report.json
```

### `crouton-ci scaffold <package>`

Generate or update documentation scaffolds.

```bash
# Generate CLAUDE.md scaffold (DRY RUN by default)
pnpm crouton-ci scaffold crouton-maps --claude

# Actually write the file (requires --write flag)
pnpm crouton-ci scaffold crouton-maps --claude --write

# Generate README.md scaffold
pnpm crouton-ci scaffold crouton-maps --readme

# Generate both
pnpm crouton-ci scaffold crouton-maps --all

# Interactive mode (prompts for descriptions, recommended)
pnpm crouton-ci scaffold crouton-maps --interactive --write

# Preview what would be generated (default behavior)
pnpm crouton-ci scaffold crouton-maps --dry-run
```

**Safety:** Scaffold refuses to overwrite existing files unless `--force` is used. Even then, it creates a `.backup` first.

**When file exists:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️  CLAUDE.md already exists                                   │
│                                                                 │
│  Options:                                                       │
│  1. Show diff (what would change)                               │
│  2. Merge (add missing sections, preserve existing)             │
│  3. Backup and replace                                          │
│  4. Abort                                                       │
│                                                                 │
│  Default: Abort (your existing content is preserved)            │
└─────────────────────────────────────────────────────────────────┘
```

### `crouton-ci docs-health`

Check `/docs` folder for stale content.

```bash
# Full health check
pnpm crouton-ci docs-health

# Suggest cleanup actions
pnpm crouton-ci docs-health --suggest

# Output JSON
pnpm crouton-ci docs-health --json
```

**Output:**
```
┌─────────────────────────────────────────────────────────────┐
│  /docs Health Check                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  upcoming/ (6 files)                                        │
│  ├── ✅ PLAN-package-rename-fyit.md — Active (Phase 0)     │
│  ├── ✅ PROGRESS-package-rename.md — Tracking file         │
│  ├── ⚠️  PLAN-keyboard-shortcuts.md — Likely DONE         │
│  │      → useCroutonShortcuts exists in crouton-core       │
│  ├── ❓ PLAN-playground.md — Unknown status                │
│  ├── ❓ PLAN-devtools-events-unification.md — Unknown      │
│  └── ✅ crouton-bookings-package-brief.md — Active         │
│                                                             │
│  briefings/ (6 files)                                       │
│  ├── ✅ block-editor-debugging-brief.md — Active issue     │
│  ├── ✅ cli-collab-presence-brief.md — Feature request     │
│  ├── ⚠️  generator-options-select-brief.md — Likely DONE  │
│  │      → optionsSelect in crouton.md skill                │
│  ├── ❓ crouton-add-command-brief.md — Unknown             │
│  ├── ❓ email-package-build-issue-brief.md — Unknown       │
│  └── ❓ schema-designer-multi-collection-brief.md          │
│                                                             │
│  Suggestions                                                │
│  ├── Move 2 files to completed/                            │
│  └── Triage 5 files with unknown status                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### `crouton-ci sync-check`

Replaces the existing sync-checker agent. Checks CLI generator docs are in sync.

```bash
pnpm crouton-ci sync-check
```

### `crouton-ci changelog <package>`

Generate changelog from git commits (conventional commits format).

```bash
# Generate changelog for a package
pnpm crouton-ci changelog crouton-editor

# Since specific version/tag
pnpm crouton-ci changelog crouton-editor --since v1.0.0

# Include dependency updates that affect this package
pnpm crouton-ci changelog crouton-editor --include-deps

# All packages
pnpm crouton-ci changelog --all

# Output formats
pnpm crouton-ci changelog crouton-editor --format md    # Markdown (default)
pnpm crouton-ci changelog crouton-editor --format json  # JSON
```

**Output:**
```
## crouton-editor

### [Unreleased]

#### Breaking Changes
- None

#### Features
- feat: Add CroutonEditorMobile component (abc123)
- feat: Add translation AI button (def456)

#### Fixes
- fix: Variable interpolation edge case (ghi789)

#### Dependencies (external changes that may affect this package)
- @nuxt/ui 4.1.0: UModal API changed ⚠️
```

### `crouton-ci impact-check`

Cross-reference external dependency changelogs with internal packages.

```bash
# Check all dependency impacts
pnpm crouton-ci impact-check

# JSON output for CI
pnpm crouton-ci impact-check --json

# Only critical/breaking changes
pnpm crouton-ci impact-check --severity critical
```

**Output:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Dependency Impact Analysis                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🔴 CRITICAL: @nuxt/ui v4.1.0 (2 days ago)                     │
│  ├── Breaking: UModal API changed                               │
│  ├── Affected crouton packages:                                 │
│  │   ├── crouton-editor (uses UModal in 3 files)               │
│  │   ├── crouton-admin (uses UModal in 5 files)                │
│  │   └── crouton-auth (uses UModal in 2 files)                 │
│  └── Docs pages to review: 4                                    │
│                                                                 │
│  🟡 NOTABLE: better-auth v2.0.0 (5 days ago)                   │
│  ├── New: Passkey improvements                                  │
│  ├── Affected: crouton-auth                                     │
│  └── Action: Review new features for adoption                   │
│                                                                 │
│  🟢 MINOR: drizzle-orm v0.35.0 (1 week ago)                    │
│  └── No breaking changes, no action needed                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Integration:** Reads from `apps/docs/data/changelog-releases.json` (populated by existing `sync-changelogs.yml` workflow).

### `crouton-ci snapshot <package>`

Generate API snapshot for breaking change detection.

```bash
# Generate snapshot
pnpm crouton-ci snapshot crouton-editor
# Creates: .snapshots/crouton-editor-api.json

# Check against existing snapshot (for CI)
pnpm crouton-ci snapshot crouton-editor --check
# Exits non-zero if API changed

# Update snapshot (after intentional changes)
pnpm crouton-ci snapshot crouton-editor --update
```

**Snapshot contains:**
```json
{
  "package": "crouton-editor",
  "version": "1.2.0",
  "generatedAt": "2024-01-19T10:00:00Z",
  "exports": {
    "components": {
      "CroutonEditorSimple": {
        "props": ["modelValue", "placeholder", "contentType", "..."],
        "emits": ["update:modelValue", "create", "update"]
      }
    },
    "composables": {
      "useEditorVariables": {
        "returns": ["interpolate", "extractVariables", "..."]
      }
    }
  }
}
```

### `crouton-ci test-examples`

Extract and test code examples from documentation.

```bash
# Test all examples in a package's docs
pnpm crouton-ci test-examples crouton-editor

# Test specific file
pnpm crouton-ci test-examples crouton-editor/CLAUDE.md

# Generate test file without running
pnpm crouton-ci test-examples crouton-editor --generate-only
```

**How it works:**
1. Extracts fenced code blocks marked with `typescript` or `vue`
2. Generates temporary test file
3. Runs TypeScript type-check on examples
4. Reports which examples fail

### `crouton-ci init-hooks`

Set up git hooks for documentation checks.

```bash
# Install pre-commit hook
pnpm crouton-ci init-hooks

# Creates .husky/pre-commit:
# pnpm crouton-ci check --changed-only
```

---

## Package Structure

```
packages/crouton-ci/
├── bin/
│   └── crouton-ci.js           # CLI entry point
├── src/
│   ├── commands/
│   │   ├── audit.ts            # audit command
│   │   ├── check.ts            # check command (CI)
│   │   ├── scaffold.ts         # scaffold command
│   │   ├── docs-health.ts      # docs-health command
│   │   ├── sync-check.ts       # sync-check command
│   │   ├── changelog.ts        # changelog command (NEW)
│   │   ├── impact-check.ts     # impact-check command (NEW)
│   │   ├── snapshot.ts         # snapshot command (NEW)
│   │   ├── test-examples.ts    # test-examples command (NEW)
│   │   └── init-hooks.ts       # init-hooks command (NEW)
│   ├── lib/
│   │   ├── analyzer.ts         # Package analysis
│   │   ├── comparator.ts       # Source vs docs comparison
│   │   ├── extractor.ts        # Extract exports from source
│   │   ├── reporter.ts         # Output formatting
│   │   ├── scaffolder.ts       # Generate doc templates
│   │   ├── changelog.ts        # Git commit parsing, changelog generation (NEW)
│   │   ├── impact.ts           # Dependency impact analysis (NEW)
│   │   ├── snapshot.ts         # API snapshot generation/comparison (NEW)
│   │   └── example-tester.ts   # Doc example extraction/testing (NEW)
│   ├── data/
│   │   └── dependency-map.ts   # Package → dependency mapping (NEW)
│   ├── templates/
│   │   ├── CLAUDE.md.hbs       # Handlebars template
│   │   ├── README.md.hbs       # Handlebars template
│   │   └── CHANGELOG.md.hbs    # Changelog template (NEW)
│   └── types.ts                # TypeScript types
├── .snapshots/                 # API snapshots (gitignored except for CI)
├── package.json
├── tsconfig.json
├── CLAUDE.md
└── README.md
```

---

## Core Types

```typescript
// src/types.ts

export type PackageCategory =
  | 'core'      // crouton-core
  | 'addon'     // Feature add-ons (editor, flow, etc.)
  | 'app'       // Mini-apps (bookings, sales)
  | 'tool'      // Tooling (cli, mcp, themes, ci)

export type PackageMaturity =
  | 'prototype' // Experimental, may change
  | 'stable'    // Working, API may evolve
  | 'production'// Battle-tested, stable API

export interface PackageExports {
  components: ComponentExport[]
  composables: ComposableExport[]
  serverUtils: ServerUtilExport[]
  types: TypeExport[]
}

export interface ComponentExport {
  name: string              // "CroutonEditorSimple"
  file: string              // "app/components/Simple.vue"
  props?: string[]          // Extracted prop names
  emits?: string[]          // Extracted emit names
  documented: boolean       // Found in CLAUDE.md?
}

export interface ComposableExport {
  name: string              // "useEditorVariables"
  file: string              // "app/composables/useEditorVariables.ts"
  returns?: string[]        // Extracted return keys
  documented: boolean
}

export interface PackageAudit {
  name: string
  path: string
  category: PackageCategory
  maturity: PackageMaturity
  fileCount: number

  exports: PackageExports

  documentation: {
    claudeMd: DocStatus
    readme: DocStatus
    docsPages: DocPageStatus[]
  }

  freshness: FreshnessScore  // NEW: How up-to-date is documentation?

  issues: AuditIssue[]

  relatedDocs: RelatedDoc[]  // Files in /docs mentioning this package
}

// ============ FRESHNESS SCORE (NEW) ============

export interface FreshnessScore {
  score: number           // 0-100, higher = fresher
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  factors: {
    lastCodeChange: Date
    lastDocChange: Date
    daysSinceCodeChange: number
    daysSinceDocChange: number
    docLag: number        // Days docs are behind code
    hasRecentBreaking: boolean  // Breaking changes in last 30 days without doc update
  }
  recommendation?: string // e.g., "Docs are 45 days behind code changes"
}

export interface DocStatus {
  exists: boolean
  path?: string
  coverage: number          // 0-100, percentage of exports documented
  issues: string[]
  outdatedRefs: string[]    // e.g., "@friendlyinternet" found
}

export interface AuditIssue {
  severity: 'error' | 'warning' | 'info'
  type:
    | 'missing-doc'         // Export not in CLAUDE.md
    | 'outdated-ref'        // Old package name found
    | 'missing-readme'      // No README.md
    | 'missing-claude'      // No CLAUDE.md
    | 'stale-docs-file'     // Related /docs file may be outdated
    | 'undocumented-type'   // Type not exported/documented
  message: string
  file?: string
  line?: number
  suggestion?: string
}

export interface DocsHealthReport {
  upcoming: DocsFileStatus[]
  briefings: DocsFileStatus[]
  projects: DocsFileStatus[]

  suggestions: {
    moveToCompleted: string[]
    needsTriage: string[]
    possiblyAbandoned: string[]
  }
}

export interface DocsFileStatus {
  path: string
  status: 'active' | 'likely-done' | 'unknown' | 'stale'
  lastModified: Date
  relatedPackages: string[]
  evidence?: string         // Why we think it's done/stale
}

// ============ CHANGELOG TYPES (NEW) ============

export interface ChangelogEntry {
  type: 'feat' | 'fix' | 'refactor' | 'docs' | 'chore' | 'breaking'
  scope?: string
  message: string
  hash: string
  date: string
  author: string
  breaking?: boolean
}

export interface PackageChangelog {
  packageName: string
  version: string
  generatedAt: string
  unreleased: ChangelogEntry[]
  releases: {
    version: string
    date: string
    entries: ChangelogEntry[]
  }[]
  dependencyChanges?: DependencyChange[]  // From impact analysis
}

export interface DependencyChange {
  package: string
  from: string
  to: string
  breaking: boolean
  summary?: string
  affectedFiles?: string[]
}

// ============ IMPACT ANALYSIS TYPES (NEW) ============

export interface DependencyMapping {
  package: string           // e.g., "crouton-editor"
  uses: string[]            // npm packages it depends on
  tracks: string[]          // Which external packages to watch
  affectedPatterns: RegExp[] // Patterns to find usage in source
}

export interface ImpactAlert {
  externalPackage: string
  externalVersion: string
  publishedAt: string
  severity: 'critical' | 'notable' | 'minor'
  breakingChanges: string[]
  newFeatures: string[]
  affectedInternalPackages: {
    name: string
    affectedFiles: string[]
    usageCount: number
  }[]
  affectedDocPages: string[]
  createdAt: string
  resolvedAt?: string
}

export interface ImpactReport {
  generatedAt: string
  externalReleasesChecked: number
  alerts: ImpactAlert[]
}

// ============ API SNAPSHOT TYPES (NEW) ============

export interface ApiSnapshot {
  package: string
  version: string
  generatedAt: string
  exports: {
    components: Record<string, {
      props: string[]
      emits: string[]
      slots?: string[]
    }>
    composables: Record<string, {
      params?: string[]
      returns: string[]
    }>
    serverUtils: Record<string, {
      params?: string[]
      returns?: string
    }>
    types: string[]
  }
}

export interface SnapshotComparison {
  package: string
  previousVersion: string
  currentVersion: string
  breaking: BreakingChange[]
  additions: string[]
  removals: string[]
}

export interface BreakingChange {
  type: 'removed' | 'changed'
  category: 'component' | 'composable' | 'serverUtil' | 'type'
  name: string
  details: string
}
```

---

## Analysis Logic

### Detecting Package Category

```typescript
function detectCategory(pkg: PackageJson, files: string[]): PackageCategory {
  const name = pkg.name

  if (name.includes('crouton-core') || name === '@fyit/crouton') return 'core'
  if (name.includes('bookings') || name.includes('sales')) return 'app'
  if (name.includes('cli') || name.includes('mcp') ||
      name.includes('themes') || name.includes('ci')) return 'tool'

  return 'addon'
}
```

### Detecting Maturity

```typescript
function detectMaturity(name: string, claudeMd?: string): PackageMaturity {
  // Check for explicit markers
  if (claudeMd?.includes('experimental') ||
      claudeMd?.includes('prototype')) return 'prototype'

  // Known prototypes
  if (name.includes('schema-designer')) return 'prototype'

  // Known production packages
  if (name.includes('core') || name.includes('auth')) return 'production'

  return 'stable'
}
```

### Extracting Component Exports

```typescript
async function extractComponents(pkgPath: string): Promise<ComponentExport[]> {
  const componentDir = path.join(pkgPath, 'app/components')
  const files = await glob('**/*.vue', { cwd: componentDir })

  return Promise.all(files.map(async (file) => {
    const content = await fs.readFile(path.join(componentDir, file), 'utf-8')
    const name = inferComponentName(pkgPath, file)

    // Extract props from defineProps
    const propsMatch = content.match(/defineProps<{([^}]+)}>/s)
    const props = propsMatch ? extractPropNames(propsMatch[1]) : []

    // Extract emits from defineEmits
    const emitsMatch = content.match(/defineEmits<{([^}]+)}>/s)
    const emits = emitsMatch ? extractEmitNames(emitsMatch[1]) : []

    return { name, file, props, emits, documented: false }
  }))
}
```

### Calculating Freshness Score

```typescript
import { simpleGit } from 'simple-git'

async function calculateFreshness(pkgPath: string): Promise<FreshnessScore> {
  const git = simpleGit()

  // Get last code change (non-doc files)
  const lastCode = await git.log({
    maxCount: 1,
    file: pkgPath,
    '--': ['*.ts', '*.vue', '*.js'].map(ext => `${pkgPath}/**/${ext}`)
  })

  // Get last doc change
  const lastDoc = await git.log({
    maxCount: 1,
    file: pkgPath,
    '--': ['*.md'].map(ext => `${pkgPath}/**/${ext}`)
  })

  const lastCodeChange = lastCode.latest ? new Date(lastCode.latest.date) : new Date()
  const lastDocChange = lastDoc.latest ? new Date(lastDoc.latest.date) : new Date(0)

  const now = Date.now()
  const daysSinceCodeChange = Math.floor((now - lastCodeChange.getTime()) / (1000 * 60 * 60 * 24))
  const daysSinceDocChange = Math.floor((now - lastDocChange.getTime()) / (1000 * 60 * 60 * 24))
  const docLag = Math.max(0, daysSinceDocChange - daysSinceCodeChange)

  // Check for recent breaking changes
  const recentBreaking = await git.log({
    maxCount: 10,
    file: pkgPath,
    '--grep': 'BREAKING\\|breaking'
  })
  const hasRecentBreaking = recentBreaking.all.some(commit => {
    const commitDate = new Date(commit.date)
    const daysSince = (now - commitDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysSince <= 30 && daysSinceDocChange > daysSince
  })

  // Calculate score (0-100)
  let score = 100

  // Penalize for doc lag
  if (docLag > 7) score -= 10
  if (docLag > 14) score -= 15
  if (docLag > 30) score -= 25
  if (docLag > 60) score -= 30

  // Heavy penalty for breaking changes without doc update
  if (hasRecentBreaking) score -= 30

  // Penalty for stale docs (even if code is also stale)
  if (daysSinceDocChange > 90) score -= 10

  score = Math.max(0, score)

  // Determine grade
  const grade =
    score >= 90 ? 'A' :
    score >= 75 ? 'B' :
    score >= 60 ? 'C' :
    score >= 40 ? 'D' : 'F'

  // Generate recommendation
  let recommendation: string | undefined
  if (hasRecentBreaking) {
    recommendation = '⚠️ Breaking changes detected without documentation update'
  } else if (docLag > 30) {
    recommendation = `Docs are ${docLag} days behind code changes - review recommended`
  } else if (daysSinceDocChange > 90) {
    recommendation = 'Documentation may be stale - consider reviewing'
  }

  return {
    score,
    grade,
    factors: {
      lastCodeChange,
      lastDocChange,
      daysSinceCodeChange,
      daysSinceDocChange,
      docLag,
      hasRecentBreaking
    },
    recommendation
  }
}
```

### Checking Documentation Coverage

```typescript
function checkCoverage(exports: PackageExports, claudeMd: string): number {
  const total =
    exports.components.length +
    exports.composables.length +
    exports.serverUtils.length +
    exports.types.length

  if (total === 0) return 100

  let documented = 0

  for (const comp of exports.components) {
    if (claudeMd.includes(comp.name)) {
      comp.documented = true
      documented++
    }
  }

  for (const composable of exports.composables) {
    if (claudeMd.includes(composable.name)) {
      composable.documented = true
      documented++
    }
  }

  // ... same for serverUtils and types

  return Math.round((documented / total) * 100)
}
```

### Dependency Mapping Data

```typescript
// src/data/dependency-map.ts

/**
 * Maps internal packages to their external dependencies
 * Used by impact-check to find affected packages when external deps update
 */
export const DEPENDENCY_MAP: DependencyMapping[] = [
  {
    package: 'crouton-editor',
    uses: ['@tiptap/core', '@tiptap/vue-3', '@tiptap/extension-*'],
    tracks: ['@tiptap/core'],
    affectedPatterns: [/useTiptap|TiptapEditor|createEditor/]
  },
  {
    package: 'crouton-auth',
    uses: ['better-auth'],
    tracks: ['better-auth'],
    affectedPatterns: [/useAuth|BetterAuth|createAuth/]
  },
  {
    package: 'crouton-core',
    uses: ['@nuxt/ui', 'drizzle-orm', 'vue'],
    tracks: ['@nuxt/ui', 'drizzle-orm', 'vue', 'nuxt'],
    affectedPatterns: [/UModal|UButton|useDrizzle|defineComponent/]
  },
  {
    package: 'crouton-collab',
    uses: ['yjs', '@hocuspocus/provider'],
    tracks: ['yjs', '@hocuspocus/provider'],
    affectedPatterns: [/useYjs|YjsProvider|HocuspocusProvider/]
  },
  {
    package: 'crouton-i18n',
    uses: ['@nuxtjs/i18n'],
    tracks: ['@nuxtjs/i18n'],
    affectedPatterns: [/useI18n|useT|LocaleSwitcher/]
  },
  {
    package: 'crouton-maps',
    uses: ['mapbox-gl', '@mapbox/mapbox-gl-geocoder'],
    tracks: ['mapbox-gl'],
    affectedPatterns: [/useMapbox|MapboxMap|mapboxgl/]
  },
  // Add more as needed...
]

/**
 * Find which internal packages are affected by an external package update
 */
export function findAffectedPackages(externalPackage: string): string[] {
  return DEPENDENCY_MAP
    .filter(m => m.tracks.some(t =>
      externalPackage.startsWith(t.replace('*', ''))
    ))
    .map(m => m.package)
}
```

### Detecting Stale /docs Files

```typescript
async function checkDocsFileStatus(
  filePath: string,
  packages: Map<string, PackageExports>
): Promise<DocsFileStatus> {
  const content = await fs.readFile(filePath, 'utf-8')
  const stats = await fs.stat(filePath)

  // Find related packages mentioned
  const relatedPackages: string[] = []
  for (const [name] of packages) {
    if (content.includes(name)) {
      relatedPackages.push(name)
    }
  }

  // Check for completion evidence
  let status: DocsFileStatus['status'] = 'unknown'
  let evidence: string | undefined

  // Check if features mentioned in brief exist in code
  if (filePath.includes('keyboard-shortcuts')) {
    if (packages.get('crouton-core')?.composables
        .some(c => c.name === 'useCroutonShortcuts')) {
      status = 'likely-done'
      evidence = 'useCroutonShortcuts exists in crouton-core'
    }
  }

  // Check for staleness (no updates in 60 days, no recent commits)
  const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceModified > 60 && status === 'unknown') {
    status = 'stale'
    evidence = `No updates in ${Math.round(daysSinceModified)} days`
  }

  return {
    path: filePath,
    status,
    lastModified: stats.mtime,
    relatedPackages,
    evidence
  }
}
```

---

## Templates

### CLAUDE.md Template

```handlebars
# CLAUDE.md - @fyit/{{packageName}}

## Package Purpose

{{#if description}}
{{description}}
{{else}}
[TODO: Describe what this package does in 1-2 sentences]
{{/if}}

## Key Files

| File | Purpose |
|------|---------|
{{#each components}}
| `{{file}}` | `{{name}}` component |
{{/each}}
{{#each composables}}
| `{{file}}` | `{{name}}` composable |
{{/each}}
{{#each serverUtils}}
| `{{file}}` | {{name}} server utility |
{{/each}}

## Components

{{#each components}}
### {{name}}

[TODO: Describe component purpose and usage]

```vue
<{{name}} />
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
{{#each props}}
| `{{this}}` | | | [TODO] |
{{/each}}

{{/each}}

## Composables

{{#each composables}}
### {{name}}

[TODO: Describe composable purpose]

```typescript
const { {{#each returns}}{{this}}{{#unless @last}}, {{/unless}}{{/each}} } = {{name}}()
```

{{/each}}

## Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@fyit/crouton', '@fyit/{{packageName}}']
})
```

## Dependencies

- **Extends**: `@fyit/crouton`
- **Peer deps**: `nuxt ^4.0.0`

## Testing

```bash
npx nuxt typecheck  # MANDATORY after changes
```
```

---

## GitHub Actions

### PR Check Workflow

```yaml
# .github/workflows/docs-check.yml
name: Documentation Check

on:
  pull_request:
    paths:
      - 'packages/**'
      - '!packages/**/*.md'  # Don't trigger on doc changes

jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build crouton-ci
        run: pnpm --filter @fyit/crouton-ci build

      - name: Check documentation sync
        id: docs-check
        run: |
          pnpm crouton-ci check --json > docs-report.json
          echo "report<<EOF" >> $GITHUB_OUTPUT
          cat docs-report.json >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT
        continue-on-error: true

      - name: Comment on PR
        uses: actions/github-script@v7
        if: always()
        with:
          script: |
            const fs = require('fs')
            const report = JSON.parse(fs.readFileSync('docs-report.json', 'utf-8'))

            if (report.issues.length === 0) {
              return // No comment needed
            }

            const warnings = report.issues.filter(i => i.severity === 'warning')
            const errors = report.issues.filter(i => i.severity === 'error')

            let body = '## 📝 Documentation Check\n\n'

            if (errors.length > 0) {
              body += `### ❌ ${errors.length} Error(s)\n\n`
              errors.forEach(e => {
                body += `- **${e.type}**: ${e.message}\n`
                if (e.suggestion) body += `  - 💡 ${e.suggestion}\n`
              })
              body += '\n'
            }

            if (warnings.length > 0) {
              body += `### ⚠️ ${warnings.length} Warning(s)\n\n`
              warnings.forEach(w => {
                body += `- **${w.type}**: ${w.message}\n`
              })
            }

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body
            })

      - name: Fail if errors
        run: |
          ERRORS=$(jq '.issues | map(select(.severity == "error")) | length' docs-report.json)
          if [ "$ERRORS" -gt 0 ]; then
            echo "Found $ERRORS documentation errors"
            exit 1
          fi
```

### Impact Check Workflow (NEW)

```yaml
# .github/workflows/impact-check.yml
name: Dependency Impact Check

on:
  schedule:
    - cron: '0 10 * * *'  # Daily at 10am UTC (after changelog sync)
  workflow_dispatch:

jobs:
  impact-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build crouton-ci
        run: pnpm --filter @fyit/crouton-ci build

      - name: Run impact check
        id: impact
        run: |
          pnpm crouton-ci impact-check --json > impact-report.json
          CRITICAL=$(jq '.alerts | map(select(.severity == "critical")) | length' impact-report.json)
          echo "critical_count=$CRITICAL" >> $GITHUB_OUTPUT

      - name: Create issue for critical impacts
        if: steps.impact.outputs.critical_count > 0
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs')
            const report = JSON.parse(fs.readFileSync('impact-report.json', 'utf-8'))
            const critical = report.alerts.filter(a => a.severity === 'critical')

            let body = '## 🚨 Critical Dependency Updates Detected\n\n'
            body += 'The following external dependencies have breaking changes that may affect our packages:\n\n'

            for (const alert of critical) {
              body += `### ${alert.externalPackage} v${alert.externalVersion}\n`
              body += `Published: ${alert.publishedAt}\n\n`

              if (alert.breakingChanges.length > 0) {
                body += '**Breaking Changes:**\n'
                alert.breakingChanges.forEach(c => body += `- ${c}\n`)
                body += '\n'
              }

              body += '**Affected Packages:**\n'
              alert.affectedInternalPackages.forEach(p => {
                body += `- \`${p.name}\` (${p.usageCount} usages in ${p.affectedFiles.length} files)\n`
              })
              body += '\n'
            }

            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `🚨 Breaking changes in ${critical.length} dependencies`,
              body,
              labels: ['dependencies', 'breaking-change', 'automated']
            })

      - name: Post summary
        run: |
          echo "## Dependency Impact Report" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          jq -r '.alerts[] | "- \(.severity): \(.externalPackage) v\(.externalVersion)"' impact-report.json >> $GITHUB_STEP_SUMMARY
```

### Weekly Audit Workflow

```yaml
# .github/workflows/weekly-audit.yml
name: Weekly Documentation Audit

on:
  schedule:
    - cron: '0 9 * * 1'  # Monday 9am UTC
  workflow_dispatch:      # Manual trigger

jobs:
  full-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup
        # ... same as above

      - name: Run full audit
        run: |
          pnpm crouton-ci audit --all --json > full-audit.json
          pnpm crouton-ci docs-health --json > docs-health.json

      - name: Create issues for problems
        uses: actions/github-script@v7
        with:
          script: |
            const audit = require('./full-audit.json')
            const health = require('./docs-health.json')

            // Create issue for packages with low coverage
            const lowCoverage = audit.packages.filter(p =>
              p.documentation.claudeMd.coverage < 70
            )

            if (lowCoverage.length > 0) {
              await github.rest.issues.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title: `📝 Documentation coverage below 70% for ${lowCoverage.length} packages`,
                body: lowCoverage.map(p =>
                  `- ${p.name}: ${p.documentation.claudeMd.coverage}%`
                ).join('\n'),
                labels: ['documentation', 'automated']
              })
            }
```

---

## Claude Skill: /audit

```markdown
# /audit - Package Audit Skill

Audit a package for documentation completeness and code health.

## Triggers

- "audit package"
- "check documentation"
- "review package"
- "/audit"

## Usage

```
/audit crouton-editor
/audit --all
/audit --docs-health
```

## Workflow

### 1. Single Package Audit

When user runs `/audit <package>`:

1. Run `pnpm crouton-ci audit <package>`
2. Present findings to user
3. If issues found, ask: "Would you like me to fix these issues?"
4. If yes:
   - Update CLAUDE.md with missing exports
   - Update README.md if needed
   - Fix outdated package references
5. Run typecheck
6. Suggest commit message

### 2. Full Audit

When user runs `/audit --all`:

1. Run `pnpm crouton-ci audit --all --json`
2. Summarize: "Found X packages with issues"
3. List packages by severity
4. Ask: "Which package would you like to fix first?"
5. Proceed with single package workflow

### 3. Docs Health

When user runs `/audit --docs-health`:

1. Run `pnpm crouton-ci docs-health`
2. Present findings
3. For items marked "likely-done":
   - Ask: "Should I move these to completed/?"
4. For items needing triage:
   - Ask questions to determine status
5. Execute cleanup actions

## Example Session

```
User: /audit crouton-editor

Claude: Auditing crouton-editor...

Found 2 issues:

1. ⚠️ Missing documentation
   - CroutonEditorToolbar not in CLAUDE.md

2. ⚠️ Outdated reference
   - Line 42: "@friendlyinternet/nuxt-crouton-editor"

Coverage: 83% (5/6 exports documented)

Would you like me to fix these issues?

User: yes

Claude: I'll update CLAUDE.md to add the missing component
and fix the package reference.

[Makes edits]

Done! Changes:
- Added CroutonEditorToolbar section to CLAUDE.md
- Updated package name to @fyit/crouton-editor

Running typecheck... ✅ No errors

Suggested commit:
  docs(crouton-editor): update CLAUDE.md with missing exports
```
```

---

## Implementation Order

### Phase 1: Core Analysis (Week 1)

1. Create package structure
2. Implement `extractor.ts` - extract exports from source
3. Implement `analyzer.ts` - package analysis
4. Implement `audit` command (basic)
5. Test on 3 packages manually

### Phase 2: Documentation Comparison (Week 1-2)

1. Implement `comparator.ts` - source vs docs
2. Add coverage calculation
3. Add outdated reference detection
4. Implement `check` command
5. Test on all packages

### Phase 3: Scaffolding (Week 2)

1. Create Handlebars templates
2. Implement `scaffolder.ts`
3. Implement `scaffold` command
4. Add interactive mode with prompts
5. Test scaffold → edit → verify flow

### Phase 4: /docs Health (Week 2)

1. Implement docs file analysis
2. Add "likely done" detection
3. Implement `docs-health` command
4. Test on current /docs folder

### Phase 5: Integration (Week 3)

1. Migrate `sync-check` command from agent
2. Create `/audit` skill
3. Add GitHub Actions workflows (docs-check, weekly-audit)
4. Documentation for crouton-ci itself
5. Remove old sync-checker agent

### Phase 6: Changelog & Impact (Week 4)

1. Implement `changelog.ts` - git log parsing, conventional commit support
2. Create `dependency-map.ts` with package → dependency mappings
3. Implement `impact.ts` - cross-reference external releases with internal usage
4. Implement `changelog` command
5. Implement `impact-check` command
6. Add impact-check GitHub Action (daily)
7. Integration with existing `sync-changelogs.yml` workflow

### Phase 7: Snapshots & Hooks (Week 5)

1. Implement `snapshot.ts` - API extraction for components/composables
2. Implement `example-tester.ts` - extract and type-check doc examples
3. Implement `snapshot` command
4. Implement `test-examples` command
5. Implement `init-hooks` command (husky integration)
6. Add `.snapshots/` storage and CI comparison
7. Update `check` command to include snapshot validation

---

## Success Criteria

### Core (Phase 1-5)
- [ ] `crouton-ci audit <pkg>` shows accurate export list
- [ ] `crouton-ci check` exits non-zero when issues found
- [ ] `crouton-ci scaffold` generates usable CLAUDE.md
- [ ] `crouton-ci docs-health` identifies stale files
- [ ] GitHub Actions comments on PRs with issues
- [ ] Weekly audit creates issues automatically
- [ ] `/audit` skill works in Claude Code

### Changelog & Impact (Phase 6)
- [ ] `crouton-ci changelog <pkg>` generates correct changelog from commits
- [ ] `crouton-ci changelog --include-deps` shows external dep changes
- [ ] `crouton-ci impact-check` cross-references external releases
- [ ] Impact check GitHub Action creates issues for breaking changes
- [ ] Integration with existing `changelog-releases.json` data

### Snapshots & Hooks (Phase 7)
- [ ] `crouton-ci snapshot <pkg>` generates accurate API snapshot
- [ ] `crouton-ci snapshot --check` detects breaking changes
- [ ] `crouton-ci test-examples` validates code examples compile
- [ ] `crouton-ci init-hooks` sets up husky pre-commit hooks
- [ ] Snapshots stored in `.snapshots/` and checked in CI

---

## Open Questions

1. **Strictness levels**: Should we have `--strict` (errors on warnings) and `--lenient` (warnings only)?

2. **Per-package config**: Should packages be able to opt-out of certain checks via `package.json` or `.crouton-ci.json`?

3. **Auto-fix scope**: How much should `--fix` do automatically vs require human review?

4. **Threshold config**: Should coverage thresholds (70%, 80%) be configurable?

---

## Integration with Existing Systems

### External Changelog Sync

The existing `sync-changelogs.yml` workflow populates:
- `apps/docs/data/changelog-packages.json` - List of external packages to track
- `apps/docs/data/changelog-releases.json` - Cached releases with AI summaries

**crouton-ci reads this data** for the `impact-check` command:

```typescript
// src/lib/impact.ts

import changelogReleases from 'apps/docs/data/changelog-releases.json'
import changelogPackages from 'apps/docs/data/changelog-packages.json'

export async function checkImpact(): Promise<ImpactReport> {
  const alerts: ImpactAlert[] = []

  for (const release of changelogReleases) {
    // Skip if already processed
    if (release.processedAt) continue

    // Find which internal packages are affected
    const affected = findAffectedPackages(release.package)
    if (affected.length === 0) continue

    // Determine severity from release content
    const severity = release.breaking ? 'critical' :
                     release.summary?.includes('new') ? 'notable' : 'minor'

    // Search internal packages for actual usage
    const affectedDetails = await Promise.all(
      affected.map(pkg => findUsageInPackage(pkg, release.package))
    )

    alerts.push({
      externalPackage: release.package,
      externalVersion: release.version,
      publishedAt: release.publishedAt,
      severity,
      breakingChanges: release.breaking || [],
      newFeatures: extractFeatures(release.summary),
      affectedInternalPackages: affectedDetails.filter(d => d.usageCount > 0),
      affectedDocPages: findRelatedDocs(release.package),
      createdAt: new Date().toISOString()
    })
  }

  return {
    generatedAt: new Date().toISOString(),
    externalReleasesChecked: changelogReleases.length,
    alerts
  }
}
```

### Workflow Sequence

```
Daily schedule:
┌─────────────────────────────────────────────────────────────────┐
│  9:00 UTC  │  sync-changelogs.yml                              │
│            │  └─ Fetches external releases                      │
│            │  └─ Updates changelog-releases.json               │
│            │  └─ Generates AI summaries                        │
├─────────────────────────────────────────────────────────────────┤
│  10:00 UTC │  impact-check.yml (NEW)                           │
│            │  └─ Reads changelog-releases.json                 │
│            │  └─ Cross-references with dependency-map          │
│            │  └─ Searches internal packages for usage          │
│            │  └─ Creates issues for critical changes           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dependencies

```json
{
  "dependencies": {
    "commander": "^12.0.0",
    "glob": "^10.0.0",
    "gray-matter": "^4.0.3",
    "handlebars": "^4.7.8",
    "picocolors": "^1.0.0",
    "simple-git": "^3.22.0",
    "semver": "^7.6.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "unbuild": "^2.0.0",
    "@types/semver": "^7.5.0"
  }
}
```
