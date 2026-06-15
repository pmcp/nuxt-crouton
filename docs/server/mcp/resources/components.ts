/**
 * Components Reference Resource
 */
export default defineMcpResource({
  uri: 'crouton://components',
  name: 'Crouton Components Reference',
  description: 'Reference for all generated and utility components in Crouton',
  mimeType: 'text/markdown',
  async handler() {
    return {
      contents: [{
        uri: 'crouton://components',
        mimeType: 'text/markdown',
        text: `# Crouton Components Reference

## Generated Components

For each collection, Crouton generates these components:

### Form.vue
Auto-generated CRUD form with Zod validation.

**Location**: \`layers/[layer]/collections/[collection]/app/components/Form.vue\`

\`\`\`vue
<template>
  <ProductsForm
    v-model="formData"
    :mode="'create' | 'edit'"
    :loading="isSubmitting"
    @submit="handleSubmit"
    @cancel="handleCancel"
  />
</template>
\`\`\`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| \`modelValue\` | \`Object\` | Form data (v-model) |
| \`mode\` | \`'create' \\| 'edit'\` | Form mode |
| \`loading\` | \`boolean\` | Submit loading state |
| \`disabled\` | \`boolean\` | Disable all inputs |
| \`errors\` | \`Record<string, string>\` | External validation errors |

**Events:**
| Event | Payload | Description |
|-------|---------|-------------|
| \`submit\` | \`FormData\` | Form submitted |
| \`cancel\` | - | Cancel clicked |
| \`update:modelValue\` | \`FormData\` | Data changed |

---

### List.vue
Data table with sorting, filtering, pagination.

**Location**: \`layers/[layer]/collections/[collection]/app/components/List.vue\`

\`\`\`vue
<template>
  <ProductsList
    :items="products"
    :loading="pending"
    :columns="customColumns"
    @row-click="handleRowClick"
    @edit="handleEdit"
    @delete="handleDelete"
  />
</template>
\`\`\`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| \`items\` | \`Array\` | Data items |
| \`loading\` | \`boolean\` | Loading state |
| \`columns\` | \`ColumnDef[]\` | Column definitions |
| \`selectable\` | \`boolean\` | Enable row selection |
| \`pagination\` | \`boolean\` | Enable pagination |

**Events:**
| Event | Payload | Description |
|-------|---------|-------------|
| \`row-click\` | \`{ item, index }\` | Row clicked |
| \`edit\` | \`item\` | Edit action |
| \`delete\` | \`item\` | Delete action |
| \`selection-change\` | \`items[]\` | Selection changed |

---

## Modal Components

### CroutonModal
Base modal wrapper.

\`\`\`vue
<CroutonModal
  v-model="isOpen"
  title="Create Product"
  size="lg"
>
  <ProductsForm @submit="onSubmit" />

  <template #footer>
    <UButton @click="isOpen = false">Cancel</UButton>
    <UButton color="primary" @click="submit">Save</UButton>
  </template>
</CroutonModal>
\`\`\`

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`modelValue\` | \`boolean\` | \`false\` | Open state |
| \`title\` | \`string\` | - | Modal title |
| \`size\` | \`'sm' \\| 'md' \\| 'lg' \\| 'xl'\` | \`'md'\` | Modal size |
| \`closeable\` | \`boolean\` | \`true\` | Show close button |

### CroutonCreateModal
Pre-configured create modal.

\`\`\`vue
<CroutonCreateModal
  v-model="showCreate"
  collection="products"
  @created="handleCreated"
/>
\`\`\`

### CroutonEditModal
Pre-configured edit modal.

\`\`\`vue
<CroutonEditModal
  v-model="showEdit"
  collection="products"
  :item-id="selectedId"
  @updated="handleUpdated"
/>
\`\`\`

### CroutonDeleteConfirm
Delete confirmation modal.

\`\`\`vue
<CroutonDeleteConfirm
  v-model="showDelete"
  :item="selectedItem"
  @confirm="handleDelete"
/>
\`\`\`

---

## Table Components

### CroutonTable
Enhanced data table.

\`\`\`vue
<CroutonTable
  :data="products"
  :columns="columns"
  :loading="pending"
  sortable
  filterable
>
  <template #cell-actions="{ row }">
    <UButton icon="i-lucide-edit" @click="edit(row)" />
    <UButton icon="i-lucide-trash" @click="remove(row)" />
  </template>
</CroutonTable>
\`\`\`

### CroutonPagination
Pagination controls.

\`\`\`vue
<CroutonPagination
  v-model:page="page"
  v-model:page-size="pageSize"
  :total="total"
/>
\`\`\`

### CroutonFilters
Filter panel.

\`\`\`vue
<CroutonFilters
  v-model="filters"
  :schema="filterSchema"
  @apply="applyFilters"
/>
\`\`\`

---

## Form Components

### CroutonFormField
Individual form field wrapper.

\`\`\`vue
<CroutonFormField
  name="price"
  label="Price"
  :error="errors.price"
  required
>
  <UInput v-model="form.price" type="number" />
</CroutonFormField>
\`\`\`

### CroutonRepeater
Repeater field for arrays.

\`\`\`vue
<CroutonRepeater
  v-model="items"
  :item-schema="lineItemSchema"
  add-label="Add Item"
>
  <template #item="{ item, index, remove }">
    <div class="flex gap-2">
      <UInput v-model="item.name" />
      <UButton icon="i-lucide-x" @click="remove(index)" />
    </div>
  </template>
</CroutonRepeater>
\`\`\`

### CroutonRelationSelect
Relation field selector.

\`\`\`vue
<CroutonRelationSelect
  v-model="categoryId"
  collection="categories"
  display-field="name"
  placeholder="Select category..."
/>
\`\`\`

---

## Layout Components

### CroutonPage
Standard page layout.

\`\`\`vue
<CroutonPage title="Products">
  <template #actions>
    <UButton @click="showCreate = true">Add Product</UButton>
  </template>

  <ProductsList />
</CroutonPage>
\`\`\`

### CroutonCard
Content card.

\`\`\`vue
<CroutonCard title="Product Details">
  <template #actions>
    <UButton icon="i-lucide-edit" />
  </template>

  <div>Card content...</div>
</CroutonCard>
\`\`\`

### CroutonEmpty
Empty state display.

\`\`\`vue
<CroutonEmpty
  v-if="products.length === 0"
  icon="i-lucide-package"
  title="No products"
  description="Get started by adding your first product."
>
  <UButton @click="showCreate = true">Add Product</UButton>
</CroutonEmpty>
\`\`\`

---

## Customization

### Overriding Generated Components

Create a component with the same name in your app:

\`\`\`
app/components/ProductsForm.vue  # Overrides generated form
\`\`\`

### Extending Generated Components

\`\`\`vue
<script setup lang="ts">
import BaseProductsForm from '#crouton/products/components/_Form.vue'
</script>

<template>
  <BaseProductsForm v-bind="$attrs">
    <template #after-fields>
      <!-- Custom fields here -->
    </template>
  </BaseProductsForm>
</template>
\`\`\`
`
      }]
    }
  }
})
