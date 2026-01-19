# Crouton E2E Test Templates

Reusable Playwright E2E test templates for any Crouton application.

## Quick Start

```bash
# From your app directory
npx crouton e2e:init

# Or manually copy
cp -r node_modules/@friendlyinternet/nuxt-crouton/e2e-templates ./e2e
```

## What's Included

| Template | Description |
|----------|-------------|
| `playwright.config.ts` | Base Playwright config with auth setup |
| `auth.setup.ts` | Authentication flow (register/login) |
| `collection-crud.ts` | Generic CRUD tests for any collection |
| `helpers.ts` | Shared test utilities |

## Configuration

Create `e2e/config.ts` in your app:

```typescript
export const e2eConfig = {
  // Test user credentials
  testUser: {
    name: 'E2E Test User',
    email: 'e2e-test@example.com',
    password: 'TestPassword123!'
  },

  // Collections to test (auto-detected if not specified)
  collections: ['projects', 'tasks', 'notes'],

  // Multi-tenant mode
  multiTenant: true,

  // Base URL (defaults to http://localhost:3000)
  baseUrl: 'http://localhost:3000'
}
```

## Running Tests

```bash
# Start dev server
pnpm dev

# Run all E2E tests
npx playwright test

# Run specific collection tests
npx playwright test collection-crud

# Run with UI
npx playwright test --ui
```

## Customizing Tests

### Adding Collection-Specific Tests

```typescript
// e2e/collections/projects.spec.ts
import { test, expect } from '@playwright/test'
import { collectionTest } from '../collection-crud'

// Use the generic CRUD tests
collectionTest('projects')

// Add custom tests
test.describe('Projects - Custom', () => {
  test('can archive a project', async ({ page }) => {
    // Custom test logic
  })
})
```

### Testing Relations

```typescript
// e2e/collections/tasks.spec.ts
import { test, expect } from '@playwright/test'
import { navigateToCollection, createItem } from '../helpers'

test('can create task linked to project', async ({ page }) => {
  // First create a project
  await navigateToCollection(page, 'projects')
  const project = await createItem(page, { name: 'Test Project' })

  // Then create a task linked to it
  await navigateToCollection(page, 'tasks')
  await createItem(page, {
    name: 'Test Task',
    projectId: project.id
  })
})
```
