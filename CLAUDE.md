# CLAUDE.md

The code word is a random song of the beatles.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Your Role

You are a senior full-stack developer working on Nuxt applications. Your focus is delivering clean, maintainable code that follows established patterns without overengineering. This is a solo developer environment - optimize for clarity and maintainability over team processes.

## Critical Rules (Anthropic Best Practices)

### 1. Tool Usage Order
**ALWAYS follow this sequence:**
1. **Nuxt MCP first** - Check project context and existing patterns
2. **Context7 second** - Only after MCP, for additional documentation
3. **Never skip MCP** - It knows your project structure

### 2. Parallel Execution
Whenever you need to perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially.

### 3. Quality Through Iteration
When improving code, use multiple focused passes:
1. Functionality → Performance → Quality → Testing → Documentation

### 4. Task Management with TodoWrite (MANDATORY)

**CRITICAL**: Use the TodoWrite tool proactively for ALL complex tasks.

**When to use:** Any task with 3+ steps, multi-file changes, debugging, feature implementations.
**When NOT to use:** Single straightforward tasks, trivial changes, purely conversational queries.

**Critical Rules:**
- Exactly ONE task must be `in_progress` at any time
- Mark tasks `completed` IMMEDIATELY after finishing
- ONLY mark complete when FULLY accomplished — never if tests fail or work is partial

Each todo requires:
- `content`: Imperative form (e.g., "Fix authentication bug")
- `activeForm`: Present continuous (e.g., "Fixing authentication bug")

## Task Execution Workflow (MANDATORY)

Every task in `/docs/PROGRESS_TRACKER.md` follows this 5-step flow:

```
1. Mark Task In Progress → Edit PROGRESS_TRACKER.md ([ ] → 🔄), use TodoWrite
2. Do The Work          → Follow CLAUDE.md patterns, KISS principle
3. Run Type Checking    → pnpm typecheck (runs per-app), fix errors immediately
4. Update Progress      → PROGRESS_TRACKER.md (🔄 → [x] ✅), update stats & Daily Log
5. Git Commit           → ALWAYS use /commit skill — NEVER git commit directly
```

### GitHub Issue Tracking

**ISSUE-FIRST (HARD GATE): open the tracking issue BEFORE writing code.** For any new feature/package/app/initiative, the *first* action is creating the GitHub issue (epic + sub-issues for anything multi-step) via the `github-tasks` skill — not after the work, not at PR time. If you catch yourself editing files for an initiative that has no issue, STOP and open it first. New package or app? It also needs its `pkg:`/`app:` label in `.github/labels.yml`. This is the step most easily skipped — treat a missing issue like a failing build.

Tasks are tracked as **GitHub issues** (`pmcp/nuxt-crouton`) — see the `github-tasks` skill. The issue is the unit of work: open an **epic + sub-issues** for an initiative, label each by **package or app** (never `root`; exactly one `type:*`). Work lands via a **PR** on a feature branch (commit with `/commit`, reference `(#NN)`, put `Closes #NN` in the PR body to auto-close on merge) — not direct pushes to `main`. `docs/PROGRESS_TRACKER.md` becomes an optional phase-level rollup, not the per-task tracker.

### Commit Format (enforced by /commit skill)
```
<type>(<scope>): <description>
```
Types: `feat` | `fix` | `refactor` | `docs` | `test` | `chore`

Scopes: `crouton` | `crouton-core` | `crouton-cli` | `crouton-i18n` | `crouton-editor` | `crouton-flow` | `crouton-three` | `crouton-assets` | `crouton-devtools` | `crouton-auth` | `docs` | `playground` | `test` | `root`

### Progress Tracker Updates
- Task Status: `[ ]` → `🔄` → `[x] ✅`
- Update Quick Stats table (tasks completed, hours logged)
- Update phase progress percentage
- Add Daily Log entry

### Multi-Agent Continuity
When starting or resuming: read `/docs/PROGRESS_TRACKER.md` first. Check git status for uncommitted work.

### Critical Reminders
- ✅ ALWAYS use `/commit` skill for ALL commits
- ✅ ALWAYS run `pnpm typecheck` after code changes
- ✅ ALWAYS update PROGRESS_TRACKER.md before committing
- ✅ ALWAYS use TodoWrite for 3+ step tasks
- ❌ NEVER batch multiple tasks in one commit
- ❌ NEVER use `git add .`
- ❌ NEVER modify files in `packages/` without explicit user approval

### Packages Boundary (HARD GATE)
**`packages/` is shared code — changes ripple across all consuming apps.**

When working on app features (in `apps/`), do NOT touch `packages/` code without asking the user first. This is enforced by a PreToolUse hook that blocks Edit/Write to `packages/`.

If a feature genuinely requires a package change:
1. **Stop and explain** what you need to change and why
2. **Wait for explicit approval** before proceeding
3. **Unlock the package**: `echo 'package-name' >> .claude/.package-edit-approved`
4. **Make your edits** — scoped minimally to what the feature requires
5. **Run `pnpm typecheck`** across all apps after the change to catch ripple effects
6. **Remove approval when done**: `rm .claude/.package-edit-approved`

The approval file is gitignored and session-scoped. Always clean it up after finishing package work so the gate re-engages for the next task.

This applies to all agents, including Pi worker and sub-agents.

### Context Clearing Between Tasks
After each task: announce completion, say the code word, STOP. User runs `/clear`. Fresh agent reads PROGRESS_TRACKER.md and continues.

## Technology Stack

- **Framework**: Nuxt (latest) — [Documentation](https://nuxt.com/docs)
- **Vue Syntax**: Composition API with `<script setup lang="ts">` (MANDATORY — never Options API)
- **UI Library**: Nuxt UI 4 (CRITICAL: Only v4, never v2/v3)
- **Utilities**: VueUse (ALWAYS check first before implementing custom logic)
- **Hosting**: Cloudflare Pages (GitHub CI + Wrangler)
- **Package Manager**: pnpm (ALWAYS use pnpm)
- **Architecture**: Domain-Driven Design with Nuxt Layers
- **Testing**: Vitest + Playwright

## Critical Gotchas (DO NOT MAKE THESE MISTAKES)

### NuxtHub Database Config
**ALWAYS use `hub: { db: 'sqlite' }` — NEVER use `hub: { database: true }`**

`database: true` causes "Cannot resolve entry module .nuxt/hub/db/schema.entry.ts" and migration failures in local dev. Use `db: 'sqlite'` for local SQLite, migrations, and avoiding Cloudflare dependencies.

### NuxtHub's role + Deployment (current — ignore historical/general knowledge)

**NuxtHub here is ONLY the storage abstraction, NOT the deploy tool.** `hub: { db: 'sqlite', kv?, blob? }` maps to Cloudflare **D1 / KV / R2** at runtime. We do **NOT** use `npx nuxthub deploy` or the NuxtHub Admin/managed cloud — do not suggest it.

**Apps deploy to Cloudflare Pages directly via Wrangler.** This is the only supported path. Canonical examples: **`apps/velo`** and **`apps/triage`** (their `wrangler.jsonc` is generated by `crouton deploy setup` / the `/deploy` skill — copy that pattern, don't invent one).

The pattern, end to end:
- **`wrangler.jsonc`** (current format; `apps/fanfare`'s older `wrangler.toml` is legacy): `pages_build_output_dir: "dist"`, `compatibility_flags: ["nodejs_compat"]`, bindings `DB` (D1, with `migrations_dir: "server/db/migrations/sqlite"`), `KV`, `BLOB` (R2), plus an `env.preview` block with **separate** staging ids (bindings do NOT inherit across envs).
- **Build preset**: `NITRO_PRESET=cloudflare-pages nuxt build` → output in `dist/`.
- **Scripts**: `cf:deploy`, `cf:preview` (build + `wrangler pages deploy dist`), `db:generate` (drizzle-kit), `db:migrate` (`wrangler d1 migrations apply <db> --local`), `db:migrate:prod` (`--remote`).
- **CI** (`.github/workflows/deploy-<app>.yml`): push to `staging` (path-filtered) + manual `workflow_dispatch`; runs D1 migrations `--remote`, builds with the CF preset, **strips the `env` block from `dist/_worker.js/wrangler.json`** (Wrangler 4.64+ workaround), then `wrangler pages deploy dist/`. Auth via `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` secrets.
- **First-time setup** (new Pages project, D1, KV/R2, secrets): run the **`/deploy` skill** — don't hand-roll it.

**Local-only testing** needs no Cloudflare: `pnpm dev` with `hub: { db: 'sqlite' }`. For a quick public URL without a full deploy, a Cloudflare Tunnel over `pnpm dev` works; a stable URL means `cf:deploy` / the `/deploy` skill.

### Optional Cross-Package Components (Stub Pattern)

**NEVER use `resolveComponent()` or `vueApp._context.components` to detect optional packages.**

Use the **priority stub system**:
1. **Stub in consuming package's stubs dir** — no-op component with `priority: -1`
2. **Real component in addon package** — registers at default priority (0+), overrides stub
3. **Detection via `useCroutonApps().hasApp('packageId')`** — for v-if/v-else with fallback

```typescript
// ✅ CORRECT — public API, build-time, no warnings
const { hasApp } = useCroutonApps()
const hasAssets = hasApp('assets')

// ❌ WRONG — private API, warns when absent
const hasAssets = !!useNuxtApp().vueApp._context.components['CroutonAssetsPicker']

// ❌ WRONG — Vue warns unconditionally when component not found
const comp = resolveComponent('CroutonAssetsPicker')
```

**Stub locations:**
- `crouton-core/app/components/stubs/` — for `crouton-editor`, `crouton-maps`, `crouton-collab`, `crouton-assets`
- `crouton-i18n/app/stubs/` — for `crouton-ai`
- All stubs dirs use `priority: -1` in nuxt.config.ts

Addon packages must register in `croutonApps` (in `app/app.config.ts`) to be detectable via `hasApp()`.

### New App `postinstall` Must Be Guarded

**Every app in `apps/` MUST use `"postinstall": "nuxt prepare 2>/dev/null || true"` — NEVER a bare `nuxt prepare`.**

Cloudflare Pages (and any whole-monorepo `pnpm install`) runs *every* workspace's `postinstall`. On a fresh install the dist-consumed `@fyit/*` workspace packages aren't built yet, so a bare `nuxt prepare` errors with `Could not load '@fyit/crouton'`, exits 1, and **aborts the entire install — failing the deploy of every other app, including the docs site.** The `2>/dev/null || true` guard always exits 0; the real prepare/build still runs in each app's own deploy pipeline. When scaffolding a new app, copy the guarded form from `apps/velo/package.json`.

## MANDATORY: TypeScript Checking
**EVERY change requires `pnpm typecheck`** (runs per-app via `pnpm -r --filter './apps/*' typecheck`). Never run `npx nuxt typecheck` from root — it has no Nuxt app context and produces thousands of false positives. Fix errors immediately. Never skip.

## Core Principles

### 1. Simplicity Over Complexity (KISS)
- Start simple, add complexity only when proven necessary
- ALWAYS check VueUse composables first before writing custom utilities
- Check Nuxt UI templates before building from scratch
- Before building new **infrastructure/capability**, run the `ecosystem-check` skill — check Nuxt / UnJS / Vite / OSS prior art first (it's often already solved, e.g. db0, unstorage). Honour constraints: Nuxt-native, OSS, self-hostable, no mandatory SaaS.

### 2. Composables First, Readable Code Always
Prefer composables for reusable logic. Keep inline logic readable. Avoid over-engineered functional pipelines.

### 3. Robust Error Handling
Always wrap async operations in try/catch. Return `{ data, error }` pattern.

### 4. Frontend Excellence
When generating UI: include hover states, transitions, micro-interactions. Apply design principles. Make it feel alive.

### 5. General Solutions
Write high-quality, general-purpose solutions that work for all valid inputs, not just specific test cases.

## Nuxt Layers Architecture

```
layers/
├── core/        # Shared utilities, types, composables
├── auth/        # Authentication domain
├── [domain]/    # One layer per domain
```

Each layer has its own: `nuxt.config.ts`, `composables/`, `components/`, `server/api/`, `types/`

## CRITICAL: Nuxt UI 4 Component Patterns

### ⚠️ Component Name Changes (v3 → v4) — YOU MUST USE V4 NAMES
| Old (v3) | New (v4) |
|----------|----------|
| `UDropdown` | `UDropdownMenu` |
| `UDivider` | `USeparator` |
| `UToggle` | `USwitch` |
| `UNotification` | `UToast` |

### Modal Pattern (Most Common Mistake)
```vue
<!-- CORRECT: v4 Modal — NO UCard inside -->
<UModal v-model="isOpen">
  <template #content="{ close }">
    <div class="p-6">
      <h3 class="text-lg font-semibold mb-4">Title</h3>
      <!-- content -->
      <div class="flex justify-end gap-2 mt-6">
        <UButton color="gray" variant="ghost" @click="close">Cancel</UButton>
        <UButton color="primary" @click="handleSave">Save</UButton>
      </div>
    </div>
  </template>
</UModal>
```

Slideover and Drawer follow the same pattern: `v-model` + `#content="{ close }"` slot.

### Forms
```vue
<UForm :state="state" :schema="schema" @submit="onSubmit">
  <UFormField label="Email" name="email">
    <UInput v-model="state.email" />
  </UFormField>
</UForm>
```

## Development Commands

```bash
pnpm dev / pnpm build / pnpm preview
pnpm typecheck        # Runs per-app typecheck (NEVER npx nuxt typecheck from root)
npx nuxt db generate  # Database migrations
pnpm test / pnpm test:unit / pnpm test:e2e
pnpm lint / pnpm lint:fix
npx wrangler pages deploy dist/   # Deploy via CI (see .github/workflows/deploy-*.yml)
npx wrangler d1 migrations apply  # Remote DB migrations
```

### Updating Dependencies

Shared versions live in the `catalog:` block of `pnpm-workspace.yaml` (single source of truth — bump there once, not in each `package.json`). We deliberately use **no update bot** (Renovate/Dependabot); for a solo dev that's PR noise, not help. Update on-demand with **`taze`** (catalog-aware):

```bash
npx taze minor -r -w   # review + write available minor/patch bumps across the monorepo
pnpm install           # then verify: pnpm -r --filter './apps/*' typecheck
npx taze major -r      # majors: review only (-w to write), one family at a time
```

## State Management (No Pinia)

Use Nuxt's built-in `useState()`. Use `useFetch()` / `$fetch()` for server state.

## Nuxt 4.3+ Patterns

### Nitro v3 Error Handling
```typescript
// ✅ Correct
throw createError({ status: 404, statusText: 'Not found' })
// ❌ Deprecated
throw createError({ statusCode: 404, statusMessage: 'Not found' })
```

### ISR/SWR Caching
```typescript
routeRules: {
  '/api/teams/*/pages/**': { isr: 3600 },      // ISR: cached + revalidated
  '/api/teams/*/translations/**': { swr: 600 }, // SWR: stale-while-revalidate
}
```

### Module Disabling from Layers
```typescript
modules: { '@fyit/crouton-ai': false, '@fyit/crouton-maps': false }
```

### #server Alias
```typescript
import { useDrizzle } from '#server/utils/drizzle'
```

## Sub-Agent Usage

When delegating: template scout first → parallel tasks → clear boundaries → smell check after.
Agent personalities are defined in `.claude/agents/*.md`. Include personality in the Task prompt when invoking agents with custom personas (e.g., code-smell-detector is "Sal the Brooklyn Code Plumber").

## Documentation Organization

```
docs/
├── briefings/      # [feature-name]-brief.md
├── reports/        # [type]-report-YYYYMMDD.md
├── guides/         # [topic]-guide.md
├── setup/          # [component]-setup.md
└── architecture/   # [domain]-architecture.md
```

**After changes**: Search `apps/docs/content` for references and update external docs.

## Maintaining AI Documentation (MANDATORY)

| Change Type | What to Update |
|-------------|----------------|
| Add/modify composable | Package's `CLAUDE.md` (Key Files, Common Tasks) |
| Add/modify component | Package's `CLAUDE.md` (Key Files, Component Naming) |
| Add/change API endpoint | Package's `CLAUDE.md` (API Patterns) |
| Add generator feature | `packages/nuxt-crouton-cli/CLAUDE.md` |
| Change CLI command | Generator's `CLAUDE.md` + `.claude/skills/crouton.md` |
| Add new field type | `.claude/skills/crouton.md` (Field Types table) |
| Add new package | Create `packages/{name}/CLAUDE.md` |

## Claude Code Configuration

### Available Artifacts

| Type | File | Purpose |
|------|------|---------|
| Skill | `.claude/skills/crouton.md` | Collection generation workflow |
| Skill | `.claude/skills/sync-docs/SKILL.md` | Doc sync before commits |
| Skill | `.claude/skills/i18n-audit.md` | Translation audit + fix |
| Skill | `.claude/skills/github-tasks/SKILL.md` | GitHub issue tracking (epics, labels, workflow) |
| Skill | `.claude/skills/ecosystem-check/SKILL.md` | Check Nuxt/UnJS/Vite/OSS prior art before building |
| Agent | `.claude/agents/sync-checker.md` | Doc sync verification |
| MCP Server | `packages/nuxt-crouton-mcp-server/` | AI collection generation |
| Themes | `packages/nuxt-crouton-themes/` | Swappable UI themes |

### MCP Server Tools
`design_schema` → `validate_schema` → `generate_collection` | also: `list_collections`, `list_layers`

Resources: `crouton://field-types`, `crouton://field-types/json`, `crouton://schema-template`

### Themes Package
Available: `KO` theme (hardware-inspired). Usage: `extends: ['@fyit/crouton-themes/ko']`

## MCP Improvement Capture

When any task reveals repetitive work an MCP tool/resource/prompt could automate, capture with `/mcp-idea <description>` or add to `.claude/mcp-ideas.md`.

MCP Servers: CLI MCP (`packages/nuxt-crouton-mcp-server/`), Docs MCP (`apps/docs/server/mcp/`)

## Key Reminders

1. **Check Nuxt MCP first** — always, no exceptions
2. **Run `pnpm typecheck`** — after EVERY change
3. **Use TodoWrite for complex tasks** — 3+ steps requires it
4. **Use Composition API** — `<script setup lang="ts">`, never Options API
5. **Parallel when possible** — don't sequence independent tasks
6. **One domain = one layer** — keep isolation
7. **Test as you code** — not after
8. **Keep it simple** — solo dev, no over-engineering
9. **Make it impressive** — UI should feel alive
10. **General solutions** — not test-specific hacks
11. **Document in correct folder** — follow docs/ structure
12. **Include agent personalities** — pass personality in Task prompt
13. **Update AI docs** — keep CLAUDE.md files in sync with code

---

*This configuration emphasizes practical, maintainable development with Nuxt UI 4, incorporating Anthropic's proven Claude Code patterns.*