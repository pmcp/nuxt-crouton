---
title: Generated vs Core Code
description: Understanding the difference between generated code and core library
icon: i-heroicons-code-bracket
---

## The Golden Rule

The most important thing to understand is that generated code is your code—edit it freely. Once files are generated into your project, you own them and can customize them however you need. Just remember not to regenerate unless you're willing to lose your changes.

## Comparison

| Generated Code | Core Library |
|----------------|--------------|
| Lives in YOUR project | Lives in node_modules |
| You customize freely | You don't edit |
| Can diverge | Stays consistent |
| Regenerate to update | npm update to update |
| Forms, lists, types | Composables, utilities |

## Generated Code Location

```
layers/[layer]/
  ├── components/
  │   └── [collection]/
  │       ├── List.vue       # Generated
  │       ├── Form.vue       # Generated
  │       └── Table.vue      # Generated
  │
  ├── composables/
  │   └── use[Collection].ts # Generated
  │
  ├── server/
  │   ├── api/teams/[id]/    # Generated API endpoints
  │   │   ├── index.get.ts   # GET all / by IDs
  │   │   ├── index.post.ts  # CREATE
  │   │   ├── [id].patch.ts  # UPDATE
  │   │   └── [id].delete.ts # DELETE
  │   └── database/
  │       ├── schema.ts      # Drizzle schema
  │       └── queries.ts     # Database query functions
  │
  └── types/
      └── [collection].ts    # Generated
```

## What Generated APIs Provide

The generated API endpoints provide a working CRUD implementation:

| Endpoint | Functionality |
|----------|--------------|
| `GET index.get.ts` | Fetch all items, or by IDs with `?ids=` |
| `POST index.post.ts` | Create new item |
| `PATCH [id].patch.ts` | Update item by ID |
| `DELETE [id].delete.ts` | Delete item by ID |

### Common Customizations

The generated APIs are starting points. Common modifications include:

- **Pagination** - Add `page` and `limit` query params ([Pagination Guide](/guides/pagination))
- **Filtering** - Add date ranges, status filters, search
- **Sorting** - Add `sortBy` and `sortDirection` params
- **Validation** - Add Zod schemas for stricter input validation
- **Permissions** - Add role-based access checks

## Core Library Components

The core library provides:
- `useCrouton()` - Modal management
- `useCollectionQuery()` - Data fetching
- `useCollectionMutation()` - Data mutations
- `CroutonList` - List component
- `CroutonButton` - Submit button
- Toast notifications
- Cache invalidation

## The Rails Scaffold Approach

Nuxt Crouton works like Rails scaffolding:

```bash
# Rails
rails generate scaffold Post title:string body:text

# Nuxt Crouton
npx crouton-generate blog posts --fields-file post-schema.json
```

Both:
1. Generate starting code
2. You own it immediately
3. Customize as needed
4. Core framework stays stable

## When to Regenerate

Regenerate when you're starting a new collection, want to update to the latest template, need to add a new field structure, or haven't made customizations yet. Don't regenerate if you've customized the generated files, added custom logic to forms, or modified validation—unless you use `--force` and accept losing your changes.

## Best Practices

Customize the generated code freely since it's yours. Use version control to track your changes and add comments to document your customizations. When you update the core library, test your customizations to make sure everything still works. And always keep backups before regenerating with `--force`.

## Related Topics

- [Collections & Layers](/fundamentals/collections)
- [Customizing Generated Code](/customization)
- [Generator Commands](/generation/cli-commands)
