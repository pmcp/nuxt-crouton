# Agent Prompt: Implement Crouton Studio

## Context

You are implementing **Crouton Studio**, an embeddable AI assistant for building Nuxt apps. The full plan is at `/docs/plans/crouton-studio.md` - read it first.

## Summary

Studio is a Nuxt layer (`packages/crouton-studio/`) that adds a `/_studio` route to any crouton app. Developers chat with an AI to create collections, adapt components, and build pages - all within their running app.

## What Exists

- `@fyit/crouton` - Core collection system with CLI generator
- `@fyit/crouton-ai` - AI chat composables (`useChat`, `useAIProvider`, `createAIProvider`)
- `@fyit/crouton-cli` - CLI for generating collections from schemas
- Test app at `apps/test-bookings/` - use this to test Studio

## Your Task: Sprint 1 - Package Scaffold

Create the basic package structure and verify it works in test-bookings.

### Step 1: Create Package

```
packages/crouton-studio/
├── app/
│   └── pages/
│       └── _studio/
│           └── index.vue          # Basic placeholder page
├── nuxt.config.ts
├── package.json
└── CLAUDE.md
```

### Step 2: package.json

```json
{
  "name": "@fyit/crouton-studio",
  "version": "0.0.1",
  "type": "module",
  "main": "./nuxt.config.ts",
  "dependencies": {
    "@fyit/crouton-ai": "workspace:*"
  },
  "peerDependencies": {
    "nuxt": "^4.0.0"
  }
}
```

### Step 3: nuxt.config.ts

```typescript
export default defineNuxtConfig({
  extends: ['@fyit/crouton-ai']
})
```

### Step 4: Basic Page

Create `app/pages/_studio/index.vue`:

```vue
<script setup lang="ts">
definePageMeta({
  layout: false
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
    <h1 class="text-2xl font-bold mb-4">Crouton Studio</h1>
    <p class="text-gray-600 dark:text-gray-400">
      Studio is working! This page is served from @fyit/crouton-studio.
    </p>
  </div>
</template>
```

### Step 5: Test in test-bookings

Add to `apps/test-bookings/nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  extends: [
    // ... existing extends
    '@fyit/crouton-studio'
  ]
})
```

Run `pnpm dev` in test-bookings, visit `http://localhost:3000/_studio`.

### Step 6: Create CLAUDE.md

Document the package following the pattern in other packages.

## Success Criteria

- [ ] Package exists at `packages/crouton-studio/`
- [ ] `/_studio` route works in test-bookings
- [ ] No TypeScript errors (`npx nuxt typecheck`)
- [ ] CLAUDE.md created

## After Sprint 1

Next sprints will add:
- Sprint 2: App scanner (discover existing collections)
- Sprint 3: Chat interface with artifact parsing
- Sprint 4: CLI integration (run crouton generate)
- Sprint 5: Component adaptation
- Sprint 6: Polish

## Key References

- Plan: `/docs/plans/crouton-studio.md`
- AI package: `packages/crouton-ai/CLAUDE.md`
- CLI package: `packages/crouton-cli/CLAUDE.md`
- Test app: `apps/test-bookings/`

## Commands

```bash
# From monorepo root
pnpm install                          # After creating package.json
cd apps/test-bookings && pnpm dev     # Test the integration
npx nuxt typecheck                    # Verify types
```

## Important Notes

1. Use `/_studio` prefix (underscore = internal/dev route)
2. Studio extends `@fyit/crouton-ai` (not crouton directly)
3. All file paths in plan are relative to package root
4. Follow existing package patterns in the monorepo
5. Run typecheck after changes