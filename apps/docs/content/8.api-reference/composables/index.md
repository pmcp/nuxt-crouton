---
title: Composables Reference
description: Complete reference for all Nuxt Crouton composables
icon: i-heroicons-code-bracket
---

Nuxt Crouton provides a comprehensive set of composables for data fetching, mutations, forms, tables, and utilities. These composables follow [Nuxt's composables conventions](https://nuxt.com/docs/guide/directory-structure/composables) and integrate seamlessly with Vue's Composition API.

## Quick Reference

### Data Composables
Fetch and manage collection data with automatic caching and reactivity.

| Composable | Purpose | Category |
|------------|---------|----------|
| `useCollection` | Simplified collection fetching (legacy pattern) | [Data](/api-reference/composables/data-composables#usecollection) |
| `useCollectionItem` | Fetch and manage a single collection item | [Data](/api-reference/composables/data-composables#usecollectionitem) |
| `useCollections` | Access all registered collections metadata | [Data](/api-reference/composables/data-composables#usecollections) |
| `useCollectionProxy` | Create reactive proxy for collection operations | [Data](/api-reference/composables/data-composables#usecollectionproxy) |
| `useExternalCollection` | Fetch data from external APIs | [Data](/api-reference/composables/data-composables#useexternalcollection) |

### Query Composables
Fetch collection data with advanced query capabilities.

| Composable | Purpose | Category |
|------------|---------|----------|
| `useCollectionQuery` | Fetch with automatic caching and reactivity | [Query](/api-reference/composables/query-composables#usecollectionquery) |

### Mutation Composables
Create, update, and delete collection data with automatic cache invalidation.

| Composable | Purpose | Category |
|------------|---------|----------|
| `useCollectionMutation` | CRUD operations for a specific collection | [Mutation](/api-reference/composables/mutation-composables#usecollectionmutation) |
| `useCroutonMutate` | One-off mutations (any collection) | [Mutation](/api-reference/composables/mutation-composables#usecroutonmutate) |

### Form Composables
Manage form state and CRUD operations with modal/slideover support.

| Composable | Purpose | Category |
|------------|---------|----------|
| `useCrouton` | Global modal and form state management | [Form](/api-reference/composables/form-composables#usecrouton) |

### Table Composables
Build interactive data tables with sorting, filtering, and pagination.

| Composable | Purpose | Category |
|------------|---------|----------|
| `useTableColumns` | Define and configure table columns | [Table](/api-reference/composables/table-composables#usetablecolumns) |
| `useTableData` | Manage table data with sorting and pagination | [Table](/api-reference/composables/table-composables#usetabledata) |
| `useTableSearch` | Add search functionality to tables | [Table](/api-reference/composables/table-composables#usetablesearch) |

### Utility Composables
Specialized helpers for translations, assets, formatting, and more.

| Composable | Purpose | Category |
|------------|---------|----------|
| `useFormatCollections` | Format collection metadata for UI display | [Utility](/api-reference/composables/utility-composables#useformatcollections) |
| `useEntityTranslations` | Handle entity-specific translations | [Utility](/api-reference/composables/utility-composables#useentitytranslations) |
| `useAssetUpload` | Manage file uploads with progress tracking | [Utility](/api-reference/composables/utility-composables#useassetupload) |
| `useTeamContext` | Multi-tenancy team context management | [Utility](/api-reference/composables/utility-composables#useteamcontext) |
| `useUsers` | User management operations | [Utility](/api-reference/composables/utility-composables#useusers) |
| `useCroutonError` | Centralized error handling | [Utility](/api-reference/composables/utility-composables#usecroutonerror) |
| `useT` | Translation helper with collection context | [Utility](/api-reference/composables/utility-composables#uset) |
| `useDependentFieldResolver` | Resolve dependent field values | [Utility](/api-reference/composables/utility-composables#usedependentfieldresolver) |
| `useExpandableSlideover` | Manage expandable slideover state | [Utility](/api-reference/composables/utility-composables#useexpandableslideover) |

## Detailed Documentation

Click any category below to view complete documentation with type signatures, parameters, examples, and best practices:

::card-group
::card
---
title: Data Composables
icon: i-heroicons-circle-stack
to: /api-reference/composables/data-composables
---
Fetch and manage collection data with automatic caching and reactivity
::

::card
---
title: Query Composables
icon: i-heroicons-magnifying-glass
to: /api-reference/composables/query-composables
---
Advanced data fetching with query parameters and reactivity
::

::card
---
title: Mutation Composables
icon: i-heroicons-pencil-square
to: /api-reference/composables/mutation-composables
---
Create, update, and delete operations with cache invalidation
::

::card
---
title: Form Composables
icon: i-heroicons-document-text
to: /api-reference/composables/form-composables
---
Manage form state and CRUD operations with modal support
::

::card
---
title: Table Composables
icon: i-heroicons-table-cells
to: /api-reference/composables/table-composables
---
Build interactive data tables with sorting and filtering
::

::card
---
title: Utility Composables
icon: i-heroicons-wrench-screwdriver
to: /api-reference/composables/utility-composables
---
Specialized helpers for translations, assets, and more
::
::

## Related Resources

- [Nuxt Composables Guide](https://nuxt.com/docs/guide/directory-structure/composables) - Learn about Nuxt's composables conventions
- [Vue Composition API](https://vuejs.org/guide/extras/composition-api-faq.html) - Understanding Vue's Composition API
- [Components Reference](/api-reference/components) - UI components documentation
- [TypeScript Types](/api-reference/types) - Type definitions and interfaces
