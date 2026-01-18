---
title: Utility Components
description: Helper components for loading states, errors, and special behaviors
icon: i-heroicons-wrench-screwdriver
---

## Utility Components

Utility components for common UI patterns like loading states and validation feedback.

---


---

## Loading

A utility component that displays loading states during CRUD operations. Automatically responds to `useCrouton()` loading state changes and shows appropriate UI feedback.

::callout{icon="i-heroicons-information-circle" color="blue"}
**Auto-wired**: The Loading component automatically reads from `useCrouton()` composable and requires no props. Simply include it in your templates where you want loading feedback.
::

### Props

**No props** - The component automatically reads loading state from `useCrouton()`.

### Internal Logic

The component connects to the global Crouton state and displays different UI based on the current `loading` value:

```typescript
// Loading states from useCrouton()
type LoadingState = 
  | 'notLoading'
  | 'create_open'  // Opening create form
  | 'create_send'  // Submitting create request
  | 'update_open'  // Opening update form
  | 'update_send'  // Submitting update request
  | 'delete_send'  // Submitting delete request
  | 'view_open'    // Opening view mode
  | 'view_send'    // Loading view data
```

### Usage

#### Basic Usage

Simply add the component to your template:

```vue
<template>
  <div>
    <Loading />
    <!-- Your other content -->
  </div>
</template>
```

#### In a Form Layout

```vue
<template>
  <div class="space-y-6">
    <Loading />
    
    <UForm v-if="!loading" :state="formState" @submit="handleSubmit">
      <!-- Form fields -->
    </UForm>
  </div>
</template>

<script setup lang="ts">
const { loading } = useCrouton()
</script>
```

#### In a Modal/Slideover

```vue
<template>
  <USlideover v-model="isOpen">
    <template #content="{ close }">
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-4">Edit Item</h3>
        
        <Loading />
        
        <UForm v-if="!loading" :state="state" @submit="onSubmit">
          <!-- Form fields -->
        </UForm>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
const { loading, open } = useCrouton()
const isOpen = ref(false)
</script>
```

### Loading State Displays

**Form Opening States** (`create_open`, `update_open`):
- Shows 5 skeleton loaders
- Each loader displays:
  - Label skeleton (h-6, w-40)
  - Input skeleton (h-10, w-full)
- Simulates form field loading

**Submit States** (`create_send`, `update_send`):
- Shows text: "SENDING UPDATE"
- Indicates active submission

**Other States**:
- `notLoading`: Nothing displayed
- `delete_send`: Nothing displayed (deletion uses confirmation modal)
- `view_open`, `view_send`: Nothing displayed

### Visual Example

When opening a form (`create_open` or `update_open`):

```
┌────────────────────────────────┐
│ ████████░░░░░░░░ (label)       │
│ ████████████████ (input)       │
│                                │
│ ████████░░░░░░░░ (label)       │
│ ████████████████ (input)       │
│                                │
│ ████████░░░░░░░░ (label)       │
│ ████████████████ (input)       │
│                                │
│ ████████░░░░░░░░ (label)       │
│ ████████████████ (input)       │
│                                │
│ ████████░░░░░░░░ (label)       │
│ ████████████████ (input)       │
└────────────────────────────────┘
```

### Integration with Crouton Forms

The Loading component works seamlessly with generated Crouton forms:

```vue
<!-- layers/products/collections/products/app/components/_Form.vue -->
<template>
  <div>
    <!-- Automatically shows loading state during form operations -->
    <Loading />
    
    <CroutonForm
      :schema="schema"
      :collection="collection"
      :items="items"
      :loading="loading"
      :action="action"
    />
  </div>
</template>

<script setup lang="ts">
const { loading } = useCrouton()
// Loading state automatically updates during:
// - Form opening (create_open, update_open)
// - Form submission (create_send, update_send)
</script>
```

### Customization

Since the component has no props, customization requires forking the component:

```vue
<!-- components/CustomLoading.vue -->
<template>
  <div class="flex flex-col items-center gap-4">
    <!-- Custom loading for form opening -->
    <template v-if="loading === 'create_open' || loading === 'update_open'">
      <div class="flex items-center gap-2 text-blue-600">
        <UIcon name="i-lucide-loader-2" class="animate-spin" />
        <span>Loading form...</span>
      </div>
    </template>

    <!-- Custom loading for submission -->
    <template v-if="loading === 'create_send' || loading === 'update_send'">
      <div class="flex items-center gap-2 text-green-600">
        <UIcon name="i-lucide-check-circle" class="animate-pulse" />
        <span>Saving changes...</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { loading } = useCrouton()
</script>
```

### Troubleshooting

**Loading component not showing anything**
- **Problem**: Component renders but no skeletons appear
- **Solution**: Check that `useCrouton()` is properly initialized. The loading state must be `'create_open'`, `'update_open'`, `'create_send'`, or `'update_send'`.

**Skeletons show too long**
- **Problem**: Loading skeletons remain visible after form loads
- **Solution**: Ensure the Crouton state is properly transitioning from `create_open`/`update_open` to `notLoading`. Check for errors in form loading.

**"SENDING UPDATE" doesn't disappear**
- **Problem**: Submit message persists after submission
- **Solution**: Verify that your API endpoint is properly responding and the Crouton state is being reset. Check for uncaught errors in submission handlers.

**Want different loading states**
- **Problem**: Need different UI for different loading scenarios
- **Solution**: Create a custom loading component (see Customization above) or use conditional rendering based on `loading` value:
  ```vue
  <template>
    <div v-if="loading === 'create_open'">Custom create loader</div>
    <div v-else-if="loading === 'update_send'">Custom save indicator</div>
  </template>
  ```

---


---

## ValidationErrorSummary

A validation error summary component that displays form validation errors grouped by tabs/sections. Provides clickable links to navigate to error locations with error counts per section.

::callout{icon="i-heroicons-exclamation-triangle" color="amber"}
**Form Validation Helper**: Use this component at the top of tabbed forms to provide users with a clear overview of validation errors across all tabs.
::

### Props

```typescript
interface Props {
  tabErrors: Record<string, number>
  navigationItems: Array<{ label: string; value: string }>
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `tabErrors` | `Record<string, number>` | Yes | - | Map of tab values to error counts (e.g., `{ 'basic': 2, 'advanced': 1 }`) |
| `navigationItems` | `Array<{ label: string; value: string }>` | Yes | - | Array of navigation items matching your tab structure |

### Events

```typescript
interface Events {
  'switch-tab': [tabValue: string]
}
```

| Event | Payload | Description |
|-------|---------|-------------|
| `switch-tab` | `tabValue: string` | Emitted when user clicks on a tab error link. Use to programmatically switch to the tab with errors. |

### Internal Logic

The component:
1. Filters `tabErrors` to only show tabs with errors (count > 0)
2. Maps tab values to readable labels using `navigationItems`
3. Calculates total error count across all tabs
4. Displays a `UAlert` (error color) if any errors exist
5. Renders clickable links for each tab with errors
6. Shows individual error counts per tab

### Usage

#### Basic Tabbed Form

```vue
<template>
  <div>
    <!-- Error summary at top -->
    <ValidationErrorSummary
      :tab-errors="tabErrors"
      :navigation-items="navigationItems"
      @switch-tab="handleSwitchTab"
    />

    <!-- Tab navigation -->
    <UTabs v-model="selectedTab" :items="navigationItems">
      <template #basic>
        <UFormField label="Name" name="name" :error="errors.name">
          <UInput v-model="state.name" />
        </UFormField>
        <!-- More fields -->
      </template>
      
      <template #advanced>
        <UFormField label="Config" name="config" :error="errors.config">
          <UInput v-model="state.config" />
        </UFormField>
        <!-- More fields -->
      </template>
    </UTabs>
  </div>
</template>

<script setup lang="ts">
const selectedTab = ref('basic')

const navigationItems = [
  { label: 'Basic Info', value: 'basic' },
  { label: 'Advanced', value: 'advanced' },
  { label: 'Settings', value: 'settings' }
]

// Error tracking per tab
const errors = ref({
  name: 'Required field',
  config: null,
  apiKey: 'Invalid format'
})

// Calculate errors per tab
const tabErrors = computed(() => ({
  basic: errors.value.name ? 1 : 0,
  advanced: errors.value.config ? 1 : 0,
  settings: errors.value.apiKey ? 1 : 0
}))

// Handle tab switch from error summary
const handleSwitchTab = (tabValue: string) => {
  selectedTab.value = tabValue
}
</script>
```

#### With Zod Schema Validation

Basic Zod integration:

```vue
<script setup lang="ts">
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Invalid email'),
  username: z.string().min(3, 'Min 3 characters'),
  bio: z.string().max(500, 'Max 500 characters'),
  website: z.string().url('Invalid URL').optional()
})

const formState = ref({
  email: '',
  username: '',
  bio: '',
  website: ''
})

const validationErrors = ref<ZodError | null>(null)

const onSubmit = async (data: any) => {
  try {
    schema.parse(data)
    validationErrors.value = null
    // Submit data
  } catch (err) {
    if (err instanceof z.ZodError) {
      validationErrors.value = err
    }
  }
}
</script>

<template>
  <UForm :state="formState" :schema="schema" @submit="onSubmit">
    <UFormField label="Email" name="email">
      <UInput v-model="formState.email" type="email" />
    </UFormField>
    <UButton type="submit">Save</UButton>
  </UForm>
</template>
```

#### Mapping Errors to Tabs

Track validation errors per tab section:

```vue
<script setup lang="ts">
const validationErrors = ref<ZodError | null>(null)

// Map field names to their tab groups
const tabErrors = computed(() => {
  if (!validationErrors.value) return { general: 0, profile: 0 }

  const errors = validationErrors.value.errors
  const generalFields = ['email', 'username']
  const profileFields = ['bio', 'website']

  return {
    general: errors.filter(e => generalFields.includes(e.path[0])).length,
    profile: errors.filter(e => profileFields.includes(e.path[0])).length
  }
})
</script>

<template>
  <ValidationErrorSummary
    :tab-errors="tabErrors"
    :navigation-items="tabs"
    @switch-tab="activeTab = $event"
  />
</template>
```

#### Multi-Step Wizard

For a complete working example demonstrating a multi-step wizard with validation tracking, step navigation, and error summary, see this interactive demo:

::callout{type="info" icon="i-heroicons-code-bracket"}
**[View Full Interactive Demo →](https://stackblitz.com/edit/nuxt-crouton-wizard-form)**

Fork the demo to explore wizard form patterns. The complete example includes:
- Multi-step wizard with step progress indicators
- Per-step validation tracking
- ValidationErrorSummary component
- Navigation controls (Previous/Next)
- Error count badges per step
- Step-by-step form submission
::

**Focused Example: Per-Step Error Tracking**

This snippet shows the key pattern for tracking validation errors per wizard step:

```vue
<script setup lang="ts">
const currentStep = ref('personal')

const steps = [
  { label: 'Personal Info', value: 'personal' },
  { label: 'Company Details', value: 'company' },
  { label: 'Preferences', value: 'preferences' }
]

// Track errors per step
const stepErrors = computed(() => ({
  personal: [errors.value.name, errors.value.email].filter(Boolean).length,
  company: [errors.value.company, errors.value.role].filter(Boolean).length,
  preferences: [errors.value.timezone].filter(Boolean).length
}))
</script>

<template>
  <div>
    <ValidationErrorSummary
      :tab-errors="stepErrors"
      :navigation-items="steps"
      @switch-tab="currentStep = $event"
    />

    <!-- Step content with conditional rendering -->
    <div v-if="currentStep === 'personal'">
      <!-- Personal info fields... -->
    </div>
    <!-- See interactive demo for complete step navigation -->
  </div>
</template>
```

### Visual Example

When there are validation errors:

```
┌─────────────────────────────────────────────────────────┐
│ ⚠ Please fix 4 validation errors                       │
│                                                          │
│ Basic Info (2 errors)                                   │
│ Advanced Settings (1 error)                             │
│ API Configuration (1 error)                             │
└─────────────────────────────────────────────────────────┘
```

Each section name is a clickable link that emits `switch-tab` event.

### Display Behavior

**When errors exist:**
- Shows red/error-colored `UAlert`
- Title: "Please fix X validation error(s)" (pluralized correctly)
- Icon: `i-lucide-triangle-alert`
- Lists each tab with errors as clickable link
- Shows error count per tab with pluralization

**When no errors:**
- Component renders nothing (hidden)
- No alert displayed

### Error Calculation Pattern

Common pattern for calculating tab errors from validation state:

```typescript
// From Zod errors
const tabErrors = computed(() => {
  if (!zodError.value) return {}
  
  const fieldToTab = {
    name: 'basic',
    email: 'basic',
    apiKey: 'advanced',
    webhookUrl: 'advanced',
    timeout: 'settings'
  }
  
  const counts: Record<string, number> = {}
  
  zodError.value.errors.forEach(error => {
    const field = error.path[0]
    const tab = fieldToTab[field]
    if (tab) {
      counts[tab] = (counts[tab] || 0) + 1
    }
  })
  
  return counts
})

// From manual validation
const tabErrors = computed(() => {
  const basic = [errors.name, errors.email].filter(Boolean).length
  const advanced = [errors.apiKey, errors.webhook].filter(Boolean).length
  const settings = [errors.timeout, errors.retries].filter(Boolean).length
  
  return { basic, advanced, settings }
})
```

### Integration with CroutonForm

Using ValidationErrorSummary with generated Crouton forms:

```vue
<!-- layers/products/collections/products/app/components/_Form.vue -->
<template>
  <div>
    <!-- Show validation errors at top -->
    <ValidationErrorSummary
      v-if="showTabs"
      :tab-errors="tabErrors"
      :navigation-items="tabNavigation"
      @switch-tab="activeTab = $event"
    />

    <CroutonForm
      :schema="schema"
      :collection="collection"
      :items="items"
      :loading="loading"
      :action="action"
    >
      <template #form-content="{ state, errors }">
        <UTabs v-model="activeTab" :items="tabNavigation">
          <!-- Tab content -->
        </UTabs>
      </template>
    </CroutonForm>
  </div>
</template>

<script setup lang="ts">
const activeTab = ref('basic')

const tabNavigation = [
  { label: 'Basic', value: 'basic' },
  { label: 'Details', value: 'details' }
]

// Calculate errors from form state
const tabErrors = computed(() => {
  // Your error calculation logic
  return { basic: 0, details: 0 }
})
</script>
```

### Styling and Theming

The component uses Nuxt UI's `UAlert` and `UButton` components with error color scheme:

```vue
<!-- Default styling -->
<UAlert
  color="error"
  icon="i-lucide-triangle-alert"
  :title="errorTitle"
/>

<!-- Customize via Nuxt UI config -->
<!-- nuxt.config.ts -->
export default defineNuxtConfig({
  ui: {
    alert: {
      color: {
        error: {
          solid: 'bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100'
        }
      }
    }
  }
})
```

### Accessibility

**Keyboard Navigation:**
- All error links are keyboard accessible
- Tab key navigates between error links
- Enter key activates tab switch

**Screen Readers:**
- Alert role announced automatically
- Error counts read aloud
- Tab names clearly labeled

**ARIA Attributes:**
```vue
<!-- Component includes proper ARIA -->
<UAlert role="alert" aria-live="polite">
  <!-- Error content -->
</UAlert>
```

### Troubleshooting

**Error summary not appearing**
- **Problem**: Component renders but no alert shows
- **Solution**: Check that `tabErrors` has at least one key with value > 0. The component only displays when errors exist.

**Tab names show as values instead of labels**
- **Problem**: Seeing "basic" instead of "Basic Info"
- **Solution**: Ensure your `navigationItems` array includes matching `value` keys for all tabs in `tabErrors`. Example:
  ```typescript
  tabErrors: { 'basic': 2 }  // value
  navigationItems: [{ label: 'Basic Info', value: 'basic' }]  // must match
  ```

**Clicking error link doesn't switch tabs**
- **Problem**: Click on error link does nothing
- **Solution**: Ensure you're listening to the `@switch-tab` event and updating your active tab:
  ```vue
  <ValidationErrorSummary
    @switch-tab="activeTab = $event"
  />
  ```

**Error counts are incorrect**
- **Problem**: Shows wrong number of errors
- **Solution**: Verify your error counting logic. Each field should only be counted once per tab:
  ```typescript
  // WRONG: Counting same error multiple times
  const errors = [state.name, state.name].filter(Boolean).length
  
  // RIGHT: Count unique field errors
  const errors = [state.name, state.email].filter(Boolean).length
  ```

**TypeScript errors with navigationItems**
- **Problem**: Type errors about label/value properties
- **Solution**: Ensure your navigation items match the expected type:
  ```typescript
  const items: Array<{ label: string; value: string }> = [
    { label: 'Tab 1', value: 'tab1' }
  ]
  ```


---

## Custom Components

While Nuxt Crouton provides these core components, you can create custom components for your specific needs:

### Custom List Component

```vue
<!-- components/ProductList.vue -->
<template>
  <div class="grid grid-cols-3 gap-4">
    <div
      v-for="product in products"
      :key="product.id"
      class="border rounded-lg p-4"
    >
      <img :src="product.imageUrl" class="w-full h-48 object-cover" />
      <h3 class="font-bold mt-2">{{ product.name }}</h3>
      <p class="text-gray-600">${{ product.price }}</p>
      <UButton @click="handleEdit(product.id)" size="sm" class="mt-2">
        Edit
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  products: Product[]
}>()

const { open } = useCrouton()

const handleEdit = (id: string) => {
  open('update', 'shopProducts', [id])
}
</script>
```

### Custom Form Button

```vue
<!-- components/SaveButton.vue -->
<template>
  <UButton
    type="submit"
    :loading="isLoading"
    :disabled="!isValid"
    color="primary"
    size="lg"
    block
  >
    <template v-if="isLoading">
      Saving...
    </template>
    <template v-else>
      {{ label }}
    </template>
  </UButton>
</template>

<script setup lang="ts">
const props = defineProps<{
  action: 'create' | 'update' | 'delete'
  loading: string
  valid: boolean
}>()

const isLoading = computed(() => props.loading === props.action)
const isValid = computed(() => props.valid)

const label = computed(() => {
  const labels = {
    create: 'Create Item',
    update: 'Save Changes',
    delete: 'Confirm Delete'
  }
  return labels[props.action]
})
</script>
```

---


---

## CroutonCollectionViewer

A collection viewer component with an integrated layout switcher that dynamically loads and renders collection-specific list components with different layout modes (table, list, grid, cards).

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `collectionName` | `string` | *required* | Name of the collection to display |
| `defaultLayout` | `'table' \| 'list' \| 'grid' \| 'cards'` | `'table'` | Initial layout mode |

### Features

- **Dynamic Component Loading**: Automatically resolves and loads the appropriate collection list component
- **Layout Switcher**: Built-in UI for switching between table, list, grid, and cards layouts
- **Error Handling**: Graceful error handling if component cannot be loaded
- **Auto-Import Support**: Works with Nuxt's auto-imported components

### Usage

```vue
<template>
  <CroutonCollectionViewer
    collection-name="products"
    default-layout="grid"
  />
</template>
```

### Component Resolution

The viewer converts collection names to component names using PascalCase:
- `products` → `ProductsList`
- `teamMembers` → `TeamMembersList`
- `shopOrders` → `ShopOrdersList`

::callout{icon="i-heroicons-information-circle" color="blue"}
**Note**: The referenced list component (e.g., `ProductsList`) must be available in your components directory or auto-imported by Nuxt.
::

### Layout Options

The switcher provides four layout modes with corresponding icons:

| Layout | Icon | Use Case |
|--------|------|----------|
| `table` | i-lucide-table | Detailed data with many columns |
| `list` | i-lucide-list | Compact row-by-row display |
| `grid` | i-lucide-grid-3x3 | Grid of cards, good for images |
| `cards` | i-lucide-layout-grid | Large cards with rich content |

---


---

## CroutonLoading

Loading skeleton component for form creation and update states.

### Props

None (uses `useCrouton().loading` state)

### Features

- **Auto-Detection**: Reads loading state from `useCrouton` composable
- **Multiple States**: Supports create/update open and send states
- **Skeleton UI**: Shows 5 form field skeletons during loading
- **Minimal**: Simple component with no configuration needed

### Usage

#### Basic Usage

```vue
<template>
  <CroutonLoading />
  <!-- Shows loading skeletons when useCrouton().loading matches states -->
</template>
```

#### Loading States

The component shows content when `loading` state is:
- `'create_open'` - Form opening for creation
- `'update_open'` - Form opening for update
- `'create_send'` - Sending create request
- `'update_send'` - Sending update request

```vue
<template>
  <div>
    <CroutonLoading />
    <!-- When loading='create_open' or 'update_open': Shows 5 field skeletons
         When loading='create_send' or 'update_send': Shows "SENDING UPDATE"
         Otherwise: Shows nothing -->
  </div>
</template>
```

#### Integration with Forms

```vue
<template>
  <div>
    <CroutonLoading />
    
    <CroutonForm
      v-if="!loading"
      :collection="collection"
      :active-item="item"
    />
  </div>
</template>

<script setup lang="ts">
const { loading } = useCrouton()
</script>
```

### Skeleton Structure

When in `create_open` or `update_open` state:
- Renders 5 skeleton rows
- Each row contains:
  - Label skeleton: `h-6 w-40`
  - Input skeleton: `h-10 w-full`
  - Gap: `gap-2`

```vue
<!-- Internal structure -->
<div v-for="i in 5" class="flex flex-col gap-2 w-full">
  <USkeleton class="h-6 w-40" />  <!-- Label -->
  <USkeleton class="h-10 w-full" /> <!-- Input -->
</div>
```

::callout{icon="i-heroicons-exclamation-triangle" color="amber"}
**Simple Component**: This is a minimal loading indicator. For more complex loading states, consider creating custom loading components for your specific use case.
::

---


---

## CroutonValidationErrorSummary

Displays validation error summary with clickable tabs to navigate to error locations.

### Props

```typescript
interface Props {
  tabErrors: Record<string, number>
  navigationItems: Array<{ label: string; value: string }>
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tabErrors` | `Record<string, number>` | - | Map of tab values to error counts |
| `navigationItems` | `Array` | - | Navigation items with labels and values |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `switch-tab` | `string` | Emitted when user clicks a tab link with errors |

### Features

- **Error Summary**: Shows total error count across all tabs
- **Tab Links**: Clickable links to switch to tabs with errors
- **Error Counts**: Displays error count per tab
- **Conditional Rendering**: Only shows when errors exist
- **Alert Style**: Uses UAlert with error color and icon
- **Pluralization**: Handles singular/plural ("error" vs "errors")

### Usage

#### Basic Usage

```vue
<template>
  <CroutonValidationErrorSummary
    :tab-errors="validationErrors"
    :navigation-items="formTabs"
    @switch-tab="handleTabSwitch"
  />
</template>

<script setup lang="ts">
const activeTab = ref('general')

const formTabs = [
  { label: 'General', value: 'general' },
  { label: 'Contact', value: 'contact' },
  { label: 'Address', value: 'address' }
]

const validationErrors = ref({
  'general': 2,
  'contact': 0,
  'address': 3
})

const handleTabSwitch = (tabValue: string) => {
  activeTab.value = tabValue
  // Optionally scroll to first error field
}
</script>
```

#### Integrated with Form

```vue
<template>
  <div>
    <CroutonValidationErrorSummary
      :tab-errors="errors"
      :navigation-items="tabs"
      @switch-tab="activeSection = $event"
    />

    <CroutonFormLayout
      v-model="activeSection"
      tabs
      :navigation-items="tabs"
      :tab-errors="errors"
    >
      <template #main="{ activeSection }">
        <div v-show="activeSection === 'profile'">
          <UFormGroup label="Name" :error="errors.name">
            <UInput v-model="form.name" />
          </UFormGroup>
        </div>
        <div v-show="activeSection === 'security'">
          <UFormGroup label="Password" :error="errors.password">
            <UInput v-model="form.password" type="password" />
          </UFormGroup>
        </div>
      </template>
    </CroutonFormLayout>
  </div>
</template>

<script setup lang="ts">
const activeSection = ref('profile')

const tabs = [
  { label: 'Profile', value: 'profile' },
  { label: 'Security', value: 'security' }
]

const errors = ref({
  'profile': 1,
  'security': 2
})

const form = ref({
  name: '',
  password: ''
})
</script>
```

#### Dynamic Error Calculation

```vue
<template>
  <CroutonValidationErrorSummary
    :tab-errors="errorsByTab"
    :navigation-items="sections"
    @switch-tab="goToTab"
  />
</template>

<script setup lang="ts">
import { z } from 'zod'

const sections = [
  { label: 'Personal Info', value: 'personal' },
  { label: 'Company', value: 'company' }
]

const personalSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email()
})

const companySchema = z.object({
  name: z.string().min(1),
  website: z.string().url()
})

const formData = ref({
  firstName: '',
  lastName: '',
  email: 'invalid',
  name: '',
  website: 'not-a-url'
})

const errorsByTab = computed(() => {
  const personalErrors = personalSchema.safeParse({
    firstName: formData.value.firstName,
    lastName: formData.value.lastName,
    email: formData.value.email
  })
  
  const companyErrors = companySchema.safeParse({
    name: formData.value.name,
    website: formData.value.website
  })
  
  return {
    'personal': personalErrors.success ? 0 : personalErrors.error.errors.length,
    'company': companyErrors.success ? 0 : companyErrors.error.errors.length
  }
})

const goToTab = (tab: string) => {
  // Switch to tab and focus first error field
  activeTab.value = tab
}
</script>
```

#### With Auto-Scroll

```vue
<template>
  <CroutonValidationErrorSummary
    :tab-errors="tabErrors"
    :navigation-items="tabs"
    @switch-tab="switchToTabAndScroll"
  />

  <div ref="formContainer">
    <!-- Form tabs content -->
  </div>
</template>

<script setup lang="ts">
const formContainer = ref<HTMLElement>()

const switchToTabAndScroll = (tabValue: string) => {
  // Switch tab
  activeTab.value = tabValue
  
  // Wait for tab to render
  nextTick(() => {
    // Find first error field in new tab
    const firstError = formContainer.value?.querySelector('[aria-invalid="true"]')
    firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    
    // Optional: Focus the field
    if (firstError instanceof HTMLElement) {
      firstError.focus()
    }
  })
}
</script>
```

### Alert Structure

```vue
<UAlert
  color="error"
  icon="i-lucide-triangle-alert"
  title="Please fix X validation errors"
>
  <template #description>
    <!-- Tab links with error counts -->
    <UButton variant="link" color="error">
      Profile (2 errors)
    </UButton>
    <UButton variant="link" color="error">
      Security (1 error)
    </UButton>
  </template>
</UAlert>
```

### Error Count Display

| Scenario | Title | Tab Display |
|----------|-------|-------------|
| 1 error total | "Please fix 1 validation error" | "Tab Name (1 error)" |
| Multiple errors | "Please fix X validation errors" | "Tab Name (X errors)" |
| Tab with 1 error | - | "Tab Name (1 error)" |
| Tab with multiple | - | "Tab Name (X errors)" |

::callout{icon="i-heroicons-information-circle" color="blue"}
**Zero Errors**: Tabs with 0 errors are not shown in the summary. The entire component is hidden when all tabs have 0 errors.
::

---

## Related Resources

- [Utility Composables](/api-reference/composables/utility-composables) - Utility helpers
- [Error Handling](/guides/best-practices#error-handling) - Error handling patterns
- [Loading States](/guides/best-practices#loading-states) - Loading state patterns
