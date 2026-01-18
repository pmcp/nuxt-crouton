---
title: Form Composables
description: Manage form state and CRUD operations with modal/slideover support
icon: i-heroicons-document-text
---


::callout{type="tip" icon="i-heroicons-book-open"}
**Working with Forms**: For complete form patterns and component usage, see [Form Patterns](/patterns/forms) and [Form Components API](/api-reference/components/form-components).
::

## useCrouton

Modal and form state management for opening and controlling CRUD forms.

### Type Signature

```typescript
function useCrouton(): {
  open: (
    action: 'create' | 'update' | 'delete',
    collection: string,
    ids?: string[],
    container?: 'slideover' | 'modal' | 'dialog',
---


---

## useCrouton

Global modal and form state management for handling CRUD operations with support for nested forms up to 5 levels deep.

### Type Signature

```typescript
interface CroutonState {
  id: string
  action: 'create' | 'update' | 'delete' | 'view' | null
  collection: string | null
  activeItem: any
  items: any[]
  loading: 'notLoading' | 'create_send' | 'update_send' | 'delete_send' | 'view_send' | 'create_open' | 'update_open' | 'delete_open' | 'view_open'
  isOpen: boolean
  containerType: 'slideover' | 'modal' | 'dialog'
}

interface PaginationState {
  currentPage: number
  pageSize: number
  sortBy: string
  sortDirection: 'asc' | 'desc'
  totalItems?: number
  totalPages?: number
}

function useCrouton(): {
  // State
  showCrouton: ComputedRef<boolean>
  loading: ComputedRef<LoadingState>
  action: ComputedRef<CroutonAction>
  items: ComputedRef<any[]>
  activeItem: ComputedRef<any>
  activeCollection: ComputedRef<string | null>
  croutonStates: Ref<CroutonState[]>
  pagination: Ref<Record<string, PaginationState>>
  
  // Methods
  open(
    action: CroutonAction,
    collection: string,
    ids?: string[],
    containerType?: 'slideover' | 'modal' | 'dialog',
    initialData?: any
  ): Promise<void>
  close(stateId?: string): void
  closeAll(): void
  removeState(stateId: string): void
  reset(): void
  setPagination(collection: string, data: Partial<PaginationState>): void
  getPagination(collection: string): PaginationState
  getDefaultPagination(collection: string): PaginationState
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | `CroutonAction` | Yes | Operation type: 'create', 'update', 'delete', or 'view' |
| `collection` | `string` | Yes | Collection name (e.g., 'users', 'bookings') |
| `ids` | `string[]` | No | Item IDs for update/delete operations |
| `containerType` | `'slideover' \| 'modal' \| 'dialog'` | No | Container type (default: 'slideover') |
| `initialData` | `any` | No | Pre-populated data for create forms |

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `showCrouton` | `ComputedRef<boolean>` | Whether any form is open |
| `loading` | `ComputedRef<LoadingState>` | Loading state of topmost form |
| `action` | `ComputedRef<CroutonAction>` | Action of topmost form |
| `activeItem` | `ComputedRef<any>` | Item being edited (from topmost form) |
| `activeCollection` | `ComputedRef<string \| null>` | Collection of topmost form |
| `items` | `ComputedRef<any[]>` | Items for deletion (from topmost form) |
| `croutonStates` | `Ref<CroutonState[]>` | Array of all open form states (for templates) |
| `pagination` | `Ref<Record<string, PaginationState>>` | Pagination state per collection |

### How It Works

**Global State Stack**: `useCrouton()` maintains an array of form states, enabling up to 5 levels of nested forms:

```
Level 1: users (update) ← croutonStates[0]
  Level 2: categories (create) ← croutonStates[1]
    Level 3: tags (create) ← croutonStates[2]
```

Each level has its own:
- Unique ID for animation handling
- Separate loading state
- Independent active item data
- Container type (modal/slideover/dialog)

**Closing Behavior**: When a form closes:
1. `close()` sets `isOpen = false` (triggers exit animation)
2. Animation completes (300ms transition)
3. Component calls `removeState()` to remove from array
4. Topmost form now visible again

### Basic Usage - Create Form

```vue
<script setup lang="ts">
const { open, showCrouton } = useCrouton()

const handleCreateClick = () => {
  open('create', 'users', [])
  // Form opens in slideover
}
</script>

<template>
  <UButton @click="handleCreateClick">
    Create User
  </UButton>
  
  <CroutonForm v-if="showCrouton" />
</template>
```

### Update Form with Pre-filled Data

```vue
<script setup lang="ts">
const { open } = useCrouton()

const handleEditClick = (userId: string) => {
  // Fetches user data automatically
  open('update', 'users', [userId], 'slideover')
  // Form opens with user pre-populated
}
</script>

<template>
  <UButton
    v-for="user in users"
    :key="user.id"
    @click="handleEditClick(user.id)"
  >
    Edit {{ user.name }}
  </UButton>
</template>
```

### Modal vs Slideover

```vue
<script setup lang="ts">
const { open } = useCrouton()

// Centered modal - single, focused form
const handleQuickEdit = (id: string) => {
  open('update', 'users', [id], 'modal')
}

// Side slideover - for complex nested workflows
const handleDetailedEdit = (id: string) => {
  open('update', 'users', [id], 'slideover')
}

// Dialog - minimal UI for destructive actions
const handleDeleteConfirm = (ids: string[]) => {
  open('delete', 'users', ids, 'dialog')
}
</script>
```

### Delete with Confirmation

```vue
<script setup lang="ts">
const { open } = useCrouton()

const handleDeleteMultiple = (selectedIds: string[]) => {
  open('delete', 'users', selectedIds, 'dialog')
  // Shows: "Delete 3 users?"
  // User confirms and items are deleted
}
</script>

<template>
  <CroutonTable
    @delete:items="handleDeleteMultiple"
  />
</template>
```

### Nested Forms (Create Category Inside Product)

Complex workflow: Edit product → Add new category → Back to product

```vue
<!-- ProductsForm.vue -->
<script setup lang="ts">
const { open } = useCrouton()
const state = ref({ name: '', category: null })

const handleAddCategory = () => {
  // Level 1: Editing product
  // Click "Add Category" button
  // → Level 2: Create category form opens (nested)
  open('create', 'categories', [], 'slideover')
}

const handleSubmit = () => {
  // After category is created and form closes:
  // Level 2 removed from stack
  // User is back in product form
  // New category is pre-selected
  const { create } = useCollectionMutation('products')
  await create(state.value)
  close()
}
</script>

<template>
  <CroutonFormField label="Category">
    <CroutonFormReferenceSelect
      v-model="state.category"
      collection="categories"
    />
    
    <UButton
      size="sm"
      color="gray"
      variant="ghost"
      @click="handleAddCategory"
    >
      + Add Category
    </UButton>
  </CroutonFormField>
  
  <UButton @click="handleSubmit">
    Create Product
  </UButton>
</template>
```

### 5-Level Deep Nesting Example

While 5 levels are technically supported, UX best practice suggests limiting to 2-3 levels:

```vue
<script setup lang="ts">
const { open, croutonStates } = useCrouton()

// Level 1: Edit Order
const editOrder = () => open('update', 'orders', ['ord-123'])

// Level 2: Add Payment Method
const addPayment = () => open('create', 'paymentMethods', [], 'slideover')

// Level 3: Configure Address
const configAddress = () => open('create', 'addresses', [], 'slideover')

// Level 4: Select Country (nested in address)
const selectCountry = () => open('update', 'countries', ['us'], 'modal')

// Level 5: View Region Details
const viewRegion = () => open('view', 'regions', ['west-coast'], 'slideover')

// Can monitor nesting depth
const currentDepth = computed(() => croutonStates.value.length)
// currentDepth.value = 5
</script>
```

### Form Submission and Closing

```vue
<script setup lang="ts">
const { close } = useCrouton()
const { create, update } = useCollectionMutation('users')

const handleSubmit = async (formData: any) => {
  try {
    if (props.action === 'create') {
      await create(formData)
      // Success toast shown by mutation
    } else if (props.action === 'update') {
      await update(formData.id, formData)
    }
  } catch (error) {
    // Error toast shown by mutation
    return
  }
  
  // Only close on success
  close()
  // Animation triggers, form slides out
}
</script>
```

### Pagination Management

```vue
<script setup lang="ts">
const { getPagination, setPagination } = useCrouton()

// Get current pagination for users collection
const usersPagination = getPagination('users')
// → { currentPage: 1, pageSize: 10, sortBy: 'createdAt', sortDirection: 'desc' }

// Update pagination (e.g., user changes sort)
const handleSort = (sortBy: string) => {
  setPagination('users', {
    currentPage: 1,  // Reset to first page when sorting
    sortBy
  })
  // Table automatically refetches with new sort
}

// Get collection-specific defaults from config
const defaults = getDefaultPagination('users')
</script>
```

### State Structure Deep Dive

Understanding how state works is crucial for debugging:

```typescript
// useCrouton internally maintains:
const croutonStates = ref<CroutonState[]>([])

// When you call open():
// 1. New state object created with unique ID
// 2. Pushed to array
// 3. For update/view, item data fetched
// 4. State marked as loaded

// Computed properties always read from TOP of stack:
const action = computed(
  () => croutonStates.value[croutonStates.value.length - 1]?.action || null
)

// This means nested forms don't interfere with parent form state
// Each level has independent data
```

### Error Handling

```vue
<script setup lang="ts">
const { open } = useCrouton()
const { foundErrors } = useCroutonError()

const handleOpenWithErrorCheck = async () => {
  // Prevents opening if errors exist from previous operation
  if (foundErrors()) {
    console.log('Cannot open form: previous operation has errors')
    return
  }
  
  // Safe to open
  open('create', 'users', [])
}
</script>
```

### Backward Compatibility

For backward compatibility, the topmost form's state is exposed via computed properties:

```vue
<script setup lang="ts">
const { 
  showCrouton,  // computed: true if any form open
  action,       // computed: action of topmost form
  activeItem,   // computed: item of topmost form
  activeCollection,
  items         // computed: items for delete (topmost form)
} = useCrouton()

// These all reference the LAST item in croutonStates array
// Useful for global _Form.vue component rendering
</script>

<template>
  <CroutonForm
    v-if="showCrouton"
    :action="action"
    :active-item="activeItem"
    :collection="activeCollection"
  />
</template>
```

### Best Practices

**DO:**
- ✅ Keep nesting to 2-3 levels for UX
- ✅ Use slideoverslideoverslideoverslideoverstates for nested workflows
- ✅ Use modals for simple, focused edits
- ✅ Use dialogs for destructive confirmations
- ✅ Let animations complete before operations
- ✅ Close forms on successful submission
- ✅ Show loading states during fetches

**DON'T:**
- ❌ Nest deeper than 5 levels (will warn and prevent)
- ❌ Open multiple modals simultaneously
- ❌ Assume item data before fetch completes
- ❌ Skip error handling
- ❌ Mutate croutonStates directly (use provided methods)

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Form doesn't open | Check collection exists, run `npx crouton-generate config crouton.config.js` |
| Form opens but no data | Wait for loading to finish before accessing `activeItem` |
| Nested form closes both levels | Component isn't calling `close()` with specific stateId |
| Max depth warning | Limit to 3-5 levels, redesign workflow for simpler nesting |
| State leaks between forms | Use computed properties, not direct array access |

---


## Related Resources

- [Form Components](/api-reference/components/form-components) - Form UI components
- [Mutation Composables](/api-reference/composables/mutation-composables) - Data mutations
- [Nuxt UI Forms](https://ui.nuxt.com/components/form) - Nuxt UI form components
