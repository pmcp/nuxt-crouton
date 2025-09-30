# Mutations Guide: Working with Data in Nuxt Crouton

This guide explains how to create, update, and delete data in your Nuxt Crouton collections.

## Table of Contents

- [Overview](#overview)
- [Quick Reference](#quick-reference)
- [The Two Approaches](#the-two-approaches)
- [useCroutonMutate - The Simple Way](#usecroutonmutate---the-simple-way)
- [useCollectionMutation - The Optimized Way](#usecollectionmutation---the-optimized-way)
- [Decision Tree](#decision-tree)
- [Common Patterns](#common-patterns)
- [Best Practices](#best-practices)
- [Error Handling](#error-handling)
- [TypeScript Support](#typescript-support)

---

## Overview

Nuxt Crouton provides two composables for mutating data:

1. **`useCroutonMutate()`** - Simple, one-liner API for quick actions anywhere
2. **`useCollectionMutation()`** - Optimized API for forms and repeated operations

Both composables:
- ✅ Automatically invalidate cache after mutations
- ✅ Show toast notifications (success/error)
- ✅ Handle API errors gracefully
- ✅ Trigger UI updates across all views
- ✅ Work with the new query-based architecture

---

## Quick Reference

```vue
<script setup>
// Simple way (like the old send())
const { mutate } = useCroutonMutate()
await mutate('create', 'adminRoles', { name: 'New Role' })
await mutate('update', 'adminRoles', { id: '123', name: 'Updated' })
await mutate('delete', 'adminRoles', ['id1', 'id2'])

// Optimized way (for forms/repeated use)
const { create, update, deleteItems } = useCollectionMutation('adminRoles')
await create({ name: 'New Role' })
await update('123', { name: 'Updated' })
await deleteItems(['id1', 'id2'])
</script>
```

---

## The Two Approaches

### Comparison Table

| Feature | `useCroutonMutate()` | `useCollectionMutation()` |
|---------|---------------------|--------------------------|
| **Syntax** | `mutate(action, collection, data)` | `create(data)` / `update(id, data)` / `deleteItems(ids)` |
| **Setup** | One-liner | Requires collection name |
| **Performance** | Slightly slower | Optimized |
| **Use Case** | Quick actions, one-offs | Forms, repeated operations |
| **TypeScript** | Basic | Full type support |
| **Generated Forms** | ❌ Not recommended | ✅ Default choice |
| **Utility Functions** | ✅ Perfect | ⚠️ Overkill |
| **Bulk Operations** | ✅ Good | ✅ Better (if same collection) |

---

## useCroutonMutate - The Simple Way

### When to Use

Perfect for:
- 🎯 Quick actions (toggle buttons, quick add, etc.)
- 🎯 One-off operations from anywhere
- 🎯 Bulk actions across different collections
- 🎯 Utility functions
- 🎯 Prototyping and testing

### API

```typescript
const { mutate } = useCroutonMutate()

// Create
await mutate('create', collectionName, data)

// Update
await mutate('update', collectionName, { id: string, ...updates })

// Delete
await mutate('delete', collectionName, string[] | string)
```

### Examples

#### Toggle Active Status

```vue
<template>
  <UButton @click="toggleActive(role)">
    {{ role.active ? 'Deactivate' : 'Activate' }}
  </UButton>
</template>

<script setup lang="ts">
import type { Role } from '~/types'

const { mutate } = useCroutonMutate()

const toggleActive = async (role: Role) => {
  await mutate('update', 'adminRoles', {
    id: role.id,
    active: !role.active
  })
}
</script>
```

#### Quick Add Button

```vue
<template>
  <UButton @click="quickAdd">
    Quick Add Default Role
  </UButton>
</template>

<script setup lang="ts">
const { mutate } = useCroutonMutate()

const quickAdd = async () => {
  await mutate('create', 'adminRoles', {
    name: 'Default Role',
    permissions: []
  })
}
</script>
```

#### Bulk Delete Selected

```vue
<template>
  <UButton
    @click="deleteSelected"
    :disabled="selectedIds.length === 0"
    color="red"
  >
    Delete {{ selectedIds.length }} items
  </UButton>
</template>

<script setup lang="ts">
const selectedIds = ref<string[]>([])
const { mutate } = useCroutonMutate()

const deleteSelected = async () => {
  await mutate('delete', 'adminRoles', selectedIds.value)
  selectedIds.value = []
}
</script>
```

#### Utility Function

```typescript
// utils/roleUtils.ts
export async function duplicateRole(roleId: string) {
  const { mutate } = useCroutonMutate()

  // Fetch original
  const original = await $fetch(`/api/roles/${roleId}`)

  // Create duplicate
  return await mutate('create', 'adminRoles', {
    ...original,
    name: `${original.name} (Copy)`
  })
}
```

#### Cross-Collection Operations

```vue
<script setup lang="ts">
const { mutate } = useCroutonMutate()

// Create user AND assign role in one function
const createUserWithRole = async (userData: any, roleId: string) => {
  // Create user
  const user = await mutate('create', 'adminUsers', userData)

  // Assign role
  await mutate('update', 'adminUsers', {
    id: user.id,
    roleId: roleId
  })

  return user
}
</script>
```

### Pros & Cons

**Pros:**
- ✅ Dead simple syntax
- ✅ Works anywhere (no collection binding)
- ✅ Perfect for quick actions
- ✅ Great for prototyping

**Cons:**
- ⚠️ Slightly slower (collection config lookup on each call)
- ⚠️ Less type-safe
- ⚠️ No autocomplete for data structure
- ⚠️ Wasteful if used repeatedly in same component

---

## useCollectionMutation - The Optimized Way

### When to Use

Perfect for:
- 🎯 Generated CRUD forms
- 🎯 Multi-step wizards
- 🎯 Components doing multiple operations on same collection
- 🎯 When you need TypeScript autocomplete
- 🎯 Performance-critical operations

### API

```typescript
const { create, update, deleteItems } = useCollectionMutation(collectionName)

// Create
await create(data)

// Update
await update(id, updates)

// Delete (multiple IDs)
await deleteItems(ids)
```

### Examples

#### Form Component (Generated)

```vue
<template>
  <UForm :state="state" @submit="handleSubmit">
    <UFormField label="Name" name="name">
      <UInput v-model="state.name" />
    </UFormField>

    <UButton type="submit" :loading="pending">
      {{ action === 'create' ? 'Create' : 'Update' }}
    </UButton>
  </UForm>
</template>

<script setup lang="ts">
interface Props {
  action: 'create' | 'update'
  initialData?: any
}

const props = defineProps<Props>()
const state = ref(props.initialData || { name: '' })
const pending = ref(false)

// Setup once, reuse for all submissions
const { create, update } = useCollectionMutation('adminRoles')

const handleSubmit = async () => {
  pending.value = true

  try {
    if (props.action === 'create') {
      await create(state.value)
    } else {
      await update(state.value.id, state.value)
    }
    // Success - form will close automatically
  } finally {
    pending.value = false
  }
}
</script>
```

#### Multi-Step Wizard

```vue
<script setup lang="ts">
const currentStep = ref(1)
const formData = ref({
  name: '',
  description: '',
  permissions: []
})

// Setup once for the entire wizard
const { create, update } = useCollectionMutation('adminRoles')

const handleStep1 = async () => {
  // Create draft
  const draft = await create({ ...formData.value, draft: true })
  formData.value.id = draft.id
  currentStep.value = 2
}

const handleStep2 = async () => {
  // Update with more data
  await update(formData.value.id, {
    ...formData.value,
    draft: true
  })
  currentStep.value = 3
}

const handleFinalSubmit = async () => {
  // Finalize
  await update(formData.value.id, {
    ...formData.value,
    draft: false
  })
}
</script>
```

#### Bulk Edit Interface

```vue
<template>
  <div>
    <h2>Bulk Edit {{ selected.length }} Roles</h2>

    <UFormField label="Set Priority">
      <UInput v-model="bulkPriority" type="number" />
    </UFormField>

    <UButton @click="applyBulkEdit">Apply to All</UButton>
  </div>
</template>

<script setup lang="ts">
const selected = ref<string[]>(['id1', 'id2', 'id3'])
const bulkPriority = ref(10)

// Setup once, use for all updates
const { update } = useCollectionMutation('adminRoles')

const applyBulkEdit = async () => {
  // Efficient - mutation instance created once
  for (const id of selected.value) {
    await update(id, { priority: bulkPriority.value })
  }
}
</script>
```

#### With TypeScript Generics

```vue
<script setup lang="ts">
import type { Role, RoleCreateInput, RoleUpdateInput } from '~/types'

// Fully typed mutations
const {
  create,
  update,
  deleteItems
} = useCollectionMutation<Role, RoleCreateInput, RoleUpdateInput>('adminRoles')

// TypeScript knows the shape of data
const newRole = await create({
  name: 'Admin',      // ✅ Type-checked
  permissions: []     // ✅ Type-checked
  // invalid: true    // ❌ TypeScript error
})

// TypeScript knows what can be updated
await update('123', {
  name: 'Updated'     // ✅ Valid
  // id: 'new-id'     // ❌ TypeScript error (id can't be updated)
})
</script>
```

### Pros & Cons

**Pros:**
- ✅ Faster (collection config cached)
- ✅ Better TypeScript support
- ✅ Cleaner, more explicit API
- ✅ Standard in generated components

**Cons:**
- ⚠️ Requires collection name upfront
- ⚠️ More verbose than `useCroutonMutate`
- ⚠️ Overkill for simple one-off actions

---

## Decision Tree

```
Need to mutate data?
│
├─ Is this inside a generated form component?
│  └─ YES → Use useCollectionMutation()
│           (Already the default)
│
├─ Will you perform multiple operations on the SAME collection?
│  └─ YES → Use useCollectionMutation()
│           (Setup once, use many times)
│
├─ Do you need TypeScript autocomplete for data structure?
│  └─ YES → Use useCollectionMutation<Type>()
│           (Full type safety)
│
├─ Is this a quick action (toggle, quick add, utility)?
│  └─ YES → Use useCroutonMutate()
│           (Keep it simple)
│
├─ Operating on multiple collections?
│  └─ YES → Use useCroutonMutate()
│           (More flexible)
│
└─ Otherwise (one-off, prototype, testing)
   └─ Use useCroutonMutate()
      (Default choice)
```

---

## Common Patterns

### Pattern: Toggle Boolean Field

```vue
<script setup lang="ts">
const { mutate } = useCroutonMutate()

const toggleField = async (id: string, field: string, currentValue: boolean) => {
  await mutate('update', 'adminRoles', {
    id,
    [field]: !currentValue
  })
}

// Usage
toggleField('123', 'active', true)
toggleField('456', 'featured', false)
</script>
```

### Pattern: Duplicate Item

```vue
<script setup lang="ts">
const { mutate } = useCroutonMutate()

const duplicate = async (collection: string, item: any) => {
  const { id, createdAt, updatedAt, ...data } = item

  return await mutate('create', collection, {
    ...data,
    name: `${data.name} (Copy)`
  })
}
</script>
```

### Pattern: Soft Delete

```vue
<script setup lang="ts">
const { mutate } = useCroutonMutate()

const softDelete = async (collection: string, ids: string[]) => {
  for (const id of ids) {
    await mutate('update', collection, {
      id,
      deletedAt: new Date().toISOString()
    })
  }
}
</script>
```

### Pattern: Batch Update

```vue
<script setup lang="ts">
const { update } = useCollectionMutation('adminRoles')

const batchUpdate = async (updates: Record<string, any>) => {
  const promises = Object.entries(updates).map(([id, data]) =>
    update(id, data)
  )

  await Promise.all(promises)
}

// Usage
await batchUpdate({
  'id1': { priority: 1 },
  'id2': { priority: 2 },
  'id3': { priority: 3 }
})
</script>
```

### Pattern: Conditional Mutation

```vue
<script setup lang="ts">
const { create, update } = useCollectionMutation('adminRoles')

const saveRole = async (role: any) => {
  if (role.id) {
    // Existing role - update
    return await update(role.id, role)
  } else {
    // New role - create
    return await create(role)
  }
}
</script>
```

---

## Best Practices

### ✅ DO: Use the Right Tool

```vue
<!-- Good: Simple action uses simple API -->
<script setup>
const { mutate } = useCroutonMutate()
const quickAdd = () => mutate('create', 'roles', { name: 'New' })
</script>

<!-- Good: Form uses optimized API -->
<script setup>
const { create, update } = useCollectionMutation('roles')
const handleSubmit = () => action === 'create' ? create(data) : update(id, data)
</script>
```

### ❌ DON'T: Create Mutation in Loop

```vue
<!-- Bad: Creating instance repeatedly -->
<script setup>
for (const id of ids) {
  const { update } = useCollectionMutation('roles') // ❌ Wasteful
  await update(id, data)
}
</script>

<!-- Good: Create once, use many -->
<script setup>
const { update } = useCollectionMutation('roles')
for (const id of ids) {
  await update(id, data) // ✅ Efficient
}
</script>
```

### ✅ DO: Handle Errors

```vue
<script setup lang="ts">
const { mutate } = useCroutonMutate()

const createRole = async (data: any) => {
  try {
    const role = await mutate('create', 'adminRoles', data)
    console.log('Created:', role)
    return role
  } catch (error) {
    // Error toast already shown by mutation composable
    console.error('Failed to create role:', error)
    // Handle error (e.g., keep form open, show details)
    return null
  }
}
</script>
```

### ✅ DO: Use TypeScript

```vue
<script setup lang="ts">
import type { Role } from '~/types'

// Type-safe mutations
const { create, update } = useCollectionMutation<Role>('adminRoles')

// Autocomplete works!
await create({
  name: 'Admin',
  permissions: ['read', 'write']
})
</script>
```

### ❌ DON'T: Mix Patterns Unnecessarily

```vue
<!-- Bad: Inconsistent -->
<script setup>
const { mutate } = useCroutonMutate()
const { create } = useCollectionMutation('roles')

// Pick one style per component!
</script>

<!-- Good: Consistent -->
<script setup>
const { create, update, deleteItems } = useCollectionMutation('roles')
// Use the same pattern throughout
</script>
```

---

## Error Handling

Both composables automatically:
- ✅ Show error toasts
- ✅ Log errors to console
- ✅ Throw errors (so you can catch them)

### Handling Errors

```vue
<script setup lang="ts">
const { mutate } = useCroutonMutate()
const pending = ref(false)
const error = ref<string | null>(null)

const saveData = async () => {
  pending.value = true
  error.value = null

  try {
    await mutate('create', 'adminRoles', formData.value)
    // Success - user sees toast
    navigateTo('/roles')
  } catch (err: any) {
    // Error toast already shown
    // But you might want to show detailed errors in the form
    error.value = err.data?.message || 'Something went wrong'
    // Keep form open so user can fix and retry
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UForm @submit="saveData">
    <UAlert v-if="error" color="red" :title="error" />
    <!-- Form fields -->
    <UButton type="submit" :loading="pending">Save</UButton>
  </UForm>
</template>
```

### Validation Errors

```vue
<script setup lang="ts">
const { create } = useCollectionMutation('adminRoles')
const validationErrors = ref<Record<string, string>>({})

const handleSubmit = async (data: any) => {
  try {
    await create(data)
  } catch (error: any) {
    if (error.statusCode === 422) {
      // Validation error from server
      validationErrors.value = error.data.errors
    }
  }
}
</script>

<template>
  <UFormField
    label="Name"
    name="name"
    :error="validationErrors.name"
  >
    <UInput v-model="state.name" />
  </UFormField>
</template>
```

---

## TypeScript Support

### Basic Types

```typescript
// Auto-inferred from collection
const { create, update } = useCollectionMutation('adminRoles')
```

### Generic Types

```typescript
import type { Role, CreateRoleInput, UpdateRoleInput } from '~/types'

const { create, update, deleteItems } = useCollectionMutation<
  Role,           // Return type
  CreateRoleInput, // Create input type
  UpdateRoleInput  // Update input type
>('adminRoles')

// TypeScript knows the exact shapes
const role: Role = await create({
  name: 'Admin',
  permissions: ['read']
})

await update('123', {
  name: 'Updated' // Only UpdateRoleInput fields allowed
})
```

### Type-Safe Wrapper

```typescript
// composables/useRoles.ts
import type { Role, CreateRoleInput, UpdateRoleInput } from '~/types'

export function useRoles() {
  return useCollectionMutation<Role, CreateRoleInput, UpdateRoleInput>('adminRoles')
}

// Usage in components
const { create, update } = useRoles() // Fully typed!
```

---

## Migration from Old API

If you're upgrading from the old `send()` API:

### Before (Old API)

```vue
<script setup>
const { send } = useCrouton()

// Create
await send('create', 'adminRoles', { name: 'Test' })

// Update
await send('update', 'adminRoles', { id: '123', name: 'Updated' })

// Delete
await send('delete', 'adminRoles', ['id1', 'id2'])
</script>
```

### After (New API - Option 1: Quick Migration)

```vue
<script setup>
const { mutate } = useCroutonMutate()

// Same signature, just swap send → mutate
await mutate('create', 'adminRoles', { name: 'Test' })
await mutate('update', 'adminRoles', { id: '123', name: 'Updated' })
await mutate('delete', 'adminRoles', ['id1', 'id2'])
</script>
```

### After (New API - Option 2: Optimized)

```vue
<script setup>
const { create, update, deleteItems } = useCollectionMutation('adminRoles')

// Cleaner API
await create({ name: 'Test' })
await update('123', { name: 'Updated' })
await deleteItems(['id1', 'id2'])
</script>
```

---

## Summary

| Scenario | Use This | Example |
|----------|----------|---------|
| Toggle button | `useCroutonMutate()` | `await mutate('update', 'roles', { id, active: !active })` |
| Quick add | `useCroutonMutate()` | `await mutate('create', 'roles', { name: 'Quick' })` |
| Generated form | `useCollectionMutation()` | `const { create, update } = useCollectionMutation('roles')` |
| Bulk operations (same collection) | `useCollectionMutation()` | `for (id of ids) await update(id, data)` |
| Bulk operations (different collections) | `useCroutonMutate()` | `await mutate('update', collection, data)` |
| Utility function | `useCroutonMutate()` | Simple and flexible |
| Type-safe form | `useCollectionMutation<T>()` | Full TypeScript support |

**Think of it like this:**
- `useCroutonMutate()` = **Quick & dirty** (jQuery style)
- `useCollectionMutation()` = **Structured & optimized** (React hooks style)

Both work great - choose based on your use case! 🚀
