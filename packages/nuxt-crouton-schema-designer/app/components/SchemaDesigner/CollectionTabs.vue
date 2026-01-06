<script setup lang="ts">
import type { ContextMenuItem } from '@nuxt/ui'
import type { CollectionSchema } from '../../types/schema'

const {
  collections,
  activeCollectionId,
  setActiveCollection,
  addCollection,
  removeCollection,
  duplicateCollection,
  renameCollection
} = useSchemaDesigner()

// Get AI animation state
const { isCollectionFromAI } = useSchemaAI()

// Add collection modal state
const showAddModal = ref(false)
const newCollectionName = ref('')

// Rename modal state
const showRenameModal = ref(false)
const renameCollectionId = ref<string | null>(null)
const renameCollectionName = ref('')

// Get validation errors for a specific collection
function getCollectionErrors(collection: CollectionSchema): string[] {
  const errors: string[] = []
  if (!collection.collectionName) {
    errors.push('Collection name required')
  }
  if (collection.fields.length === 0) {
    errors.push('No fields')
  }
  const fieldNames = collection.fields.map(f => f.name).filter(Boolean)
  const duplicates = fieldNames.filter((name, i) => fieldNames.indexOf(name) !== i)
  if (duplicates.length > 0) {
    errors.push('Duplicate field names')
  }
  for (const field of collection.fields) {
    if (!field.name) {
      errors.push('Field missing name')
      break
    }
  }
  return errors
}

function hasErrors(collection: CollectionSchema): boolean {
  return getCollectionErrors(collection).length > 0
}

// Context menu for each tab
function getContextMenuItems(collection: CollectionSchema): ContextMenuItem[][] {
  const canDelete = collections.value.length > 1

  return [
    [
      {
        label: 'Rename',
        icon: 'i-lucide-pencil',
        onSelect: () => openRenameModal(collection)
      },
      {
        label: 'Duplicate',
        icon: 'i-lucide-copy',
        onSelect: () => duplicateCollection(collection.id)
      }
    ],
    [
      {
        label: 'Delete',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        disabled: !canDelete,
        onSelect: () => {
          if (canDelete) {
            removeCollection(collection.id)
          }
        }
      }
    ]
  ]
}

function handleAddCollection() {
  const name = newCollectionName.value.trim()
  addCollection(name)
  newCollectionName.value = ''
  showAddModal.value = false
}

function openRenameModal(collection: CollectionSchema) {
  renameCollectionId.value = collection.id
  renameCollectionName.value = collection.collectionName
  showRenameModal.value = true
}

function handleRename() {
  if (renameCollectionId.value && renameCollectionName.value.trim()) {
    renameCollection(renameCollectionId.value, renameCollectionName.value.trim())
    showRenameModal.value = false
    renameCollectionId.value = null
    renameCollectionName.value = ''
  }
}

function getDisplayName(collection: CollectionSchema): string {
  return collection.collectionName || 'unnamed'
}
</script>

<template>
  <div class="flex items-center gap-1 px-4 py-2 bg-[var(--ui-bg-elevated)] border-b border-[var(--ui-border)] overflow-x-auto">
    <!-- Collection Tabs -->
    <template v-for="collection in collections" :key="collection.id">
      <UContextMenu :items="getContextMenuItems(collection)">
        <button
          :class="[
            'group relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
            'hover:bg-[var(--ui-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-primary)]',
            activeCollectionId === collection.id
              ? 'bg-[var(--ui-bg)] text-[var(--ui-text)] shadow-sm ring-1 ring-[var(--ui-border)]'
              : 'text-[var(--ui-text-muted)]',
            isCollectionFromAI(collection.id) && 'animate-pulse ring-2 ring-[var(--ui-primary)] ring-opacity-50'
          ]"
          @click="setActiveCollection(collection.id)"
        >
          <!-- Collection name -->
          <span :class="{ 'italic opacity-60': !collection.collectionName }">
            {{ getDisplayName(collection) }}
          </span>

          <!-- Warning icon for validation errors -->
          <UTooltip
            v-if="hasErrors(collection)"
            :text="getCollectionErrors(collection).join(', ')"
          >
            <UIcon
              name="i-lucide-alert-triangle"
              class="size-4 text-amber-500"
            />
          </UTooltip>

          <!-- Active indicator -->
          <span
            v-if="activeCollectionId === collection.id"
            class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[var(--ui-primary)] rounded-full"
          />
        </button>
      </UContextMenu>
    </template>

    <!-- Add Collection Button -->
    <UTooltip text="Add collection">
      <UButton
        variant="ghost"
        color="neutral"
        size="xs"
        icon="i-lucide-plus"
        class="ml-1"
        @click="showAddModal = true"
      />
    </UTooltip>

    <!-- Add Collection Modal -->
    <UModal v-model:open="showAddModal">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">Add Collection</h3>

          <UFormField label="Collection Name">
            <UInput
              v-model="newCollectionName"
              placeholder="e.g., products, orders, users"
              autofocus
              @keyup.enter="handleAddCollection"
            />
          </UFormField>

          <p class="text-xs text-[var(--ui-text-muted)] mt-2">
            Use lowercase, singular names (e.g., "product" not "Products")
          </p>

          <div class="flex justify-end gap-2 mt-6">
            <UButton variant="ghost" color="neutral" @click="close">
              Cancel
            </UButton>
            <UButton @click="handleAddCollection">
              Add Collection
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Rename Collection Modal -->
    <UModal v-model:open="showRenameModal">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">Rename Collection</h3>

          <UFormField label="Collection Name">
            <UInput
              v-model="renameCollectionName"
              placeholder="e.g., products"
              autofocus
              @keyup.enter="handleRename"
            />
          </UFormField>

          <div class="flex justify-end gap-2 mt-6">
            <UButton variant="ghost" color="neutral" @click="close">
              Cancel
            </UButton>
            <UButton :disabled="!renameCollectionName.trim()" @click="handleRename">
              Rename
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
