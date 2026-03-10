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

### Commit Format (enforced by /commit skill)
```
<type>(<scope>): <description>
```
Types: `feat` | `fix` | `refactor` | `docs` | `test` | `chore`

Scopes: `crouton` | `crouton-core` | `crouton-cli` | `crouton-i18n` | `crouton-editor` | `crouton-flow` | `crouton-assets` | `crouton-devtools` | `crouton-auth` | `docs` | `playground` | `test` | `root`

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

## MANDATORY: TypeScript Checking
**EVERY change requires `pnpm typecheck`** (runs per-app via `pnpm -r --filter './apps/*' typecheck`). Never run `npx nuxt typecheck` from root — it has no Nuxt app context and produces thousands of false positives. Fix errors immediately. Never skip.

## Core Principles

### 1. Simplicity Over Complexity (KISS)
- Start simple, add complexity only when proven necessary
- ALWAYS check VueUse composables first before writing custom utilities
- Check Nuxt UI templates before building from scratch

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