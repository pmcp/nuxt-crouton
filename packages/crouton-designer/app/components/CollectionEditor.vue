<script setup lang="ts">
import type { AccordionItem } from '@nuxt/ui'
import type { DesignerField } from '../types/schema'

const props = defineProps<{
  projectId: string
}>()

const editor = useCollectionEditor(toRef(props, 'projectId'))
const { collectionsWithFields, loading } = editor
const { t } = useT()

// Validation
const { issues, errors, warnings, getCollectionIssues, getFieldIssues } = useSchemaValidation(collectionsWithFields)

// Provide editor to child components
provide('collectionEditor', editor)

// Initialize on mount
onMounted(() => editor.fetchAll())

// Accordion items derived from collections
const accordionItems = computed<AccordionItem[]>(() =>
  collectionsWithFields.value.map(col => {
    const colIssues = getCollectionIssues(col.id)
    const hasErrors = colIssues.some(i => i.type === 'error')
    return {
      label: col.name,
      value: col.id,
      icon: hasErrors ? 'i-lucide-alert-circle' : 'i-lucide-database',
      ui: hasErrors ? { trigger: 'text-[var(--ui-color-error-500)]' } : undefined
    }
  })
)

// Track expanded accordion items
const expandedItems = ref<string[]>([])

// Inline editing for collection name
const editingCollectionId = ref<string | null>(null)
const editCollectionName = ref('')

function startEditCollectionName(collectionId: string) {
  const col = collectionsWithFields.value.find(c => c.id === collectionId)
  if (!col) return
  editCollectionName.value = col.name
  editingCollectionId.value = collectionId
}

async function saveCollectionName(collectionId: string) {
  const trimmed = editCollectionName.value.trim()
  if (trimmed) {
    await editor.updateCollection(collectionId, { name: trimmed })
  }
  editingCollectionId.value = null
}

function getFieldCount(collectionId: string): number {
  return editor.fieldsByCollection.value.get(collectionId)?.length || 0
}

function getFields(collectionId: string): DesignerField[] {
  return editor.fieldsByCollection.value.get(collectionId) || []
}

// Add new collection
async function handleAddCollection() {
  const result = await editor.createCollection({ name: 'NewCollection' })
  expandedItems.value = [...expandedItems.value, result.id]
}

// Add field to a collection
async function handleAddField(collectionId: string) {
  await editor.addField({
    collectionId,
    name: 'newField',
    type: 'string',
    sortOrder: String(getFieldCount(collectionId))
  })
}

// Delete a collection
async function handleDeleteCollection(collectionId: string) {
  await editor.deleteCollection(collectionId)
}

// Delete a field
async function handleDeleteField(fieldId: string) {
  await editor.deleteField(fieldId)
}

// Update field
async function handleUpdateField(fieldId: string, updates: { name?: string, type?: string, meta?: Record<string, any>, refTarget?: string }) {
  await editor.updateField(fieldId, updates)
}

// Reorder fields
async function handleReorderFields(collectionId: string, fieldIds: string[]) {
  await editor.reorderFields(collectionId, fieldIds)
}

// Expose editor for parent to use (AI tool wiring)
defineExpose({ editor })
</script>

<template>
  <div class="p-4 space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h3 class="text-lg font-semibold">{{ t('designer.collections.title') }}</h3>
        <UBadge v-if="errors.length > 0" color="error" variant="subtle" size="xs">
          {{ errors.length }} {{ errors.length === 1 ? t('designer.collections.issue') : t('designer.collections.issues') }}
        </UBadge>
        <UBadge v-else-if="warnings.length > 0" color="warning" variant="subtle" size="xs">
          {{ warnings.length }} {{ warnings.length === 1 ? t('designer.collections.warning') : t('designer.collections.warnings') }}
        </UBadge>
      </div>
      <UButton
        :label="t('designer.collections.addCollection')"
        icon="i-lucide-plus"
        size="sm"
        @click="handleAddCollection"
      />
    </div>

    <!-- Validation issues banner -->
    <div v-if="issues.filter(i => !i.collectionId).length > 0" class="space-y-1">
      <div
        v-for="issue in issues.filter(i => !i.collectionId)"
        :key="issue.code + issue.message"
        class="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md"
        :class="issue.type === 'error' ? 'bg-[var(--ui-color-error-50)] text-[var(--ui-color-error-500)]' : 'bg-[var(--ui-color-warning-50)] text-[var(--ui-color-warning-500)]'"
      >
        <UIcon :name="issue.type === 'error' ? 'i-lucide-alert-circle' : 'i-lucide-alert-triangle'" class="size-3.5 shrink-0" />
        {{ issue.message }}
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-[var(--ui-text-muted)]" />
    </div>

    <!-- Empty state -->
    <div v-else-if="collectionsWithFields.length === 0" class="text-center py-12 text-[var(--ui-text-muted)]">
      <UIcon name="i-lucide-database" class="size-12 mx-auto mb-3 opacity-50" />
      <p>{{ t('designer.collections.noCollections') }}</p>
      <p class="text-sm mt-1">{{ t('designer.collections.noCollectionsHint') }}</p>
    </div>

    <!-- Accordion -->
    <UAccordion
      v-else
      v-model="expandedItems"
      type="multiple"
      :items="accordionItems"
    >
      <template #trailing="{ item }">
        <div class="flex items-center gap-2">
          <!-- Collection-level validation indicator -->
          <UTooltip
            v-if="getCollectionIssues(item.value as string).some(i => i.type === 'error')"
            :text="getCollectionIssues(item.value as string).filter(i => i.type === 'error').map(i => i.message).join(', ')"
          >
            <UIcon name="i-lucide-alert-circle" class="size-4 text-[var(--ui-color-error-500)]" />
          </UTooltip>

          <UBadge
            variant="subtle"
            color="neutral"
            size="xs"
            :label="t('designer.collections.fieldCount', { params: { count: getFieldCount(item.value as string) } })"
          />
          <UButton
            icon="i-lucide-pencil"
            variant="ghost"
            color="neutral"
            size="xs"
            @click.stop="startEditCollectionName(item.value as string)"
          />
          <UButton
            icon="i-lucide-trash-2"
            variant="ghost"
            color="error"
            size="xs"
            @click.stop="handleDeleteCollection(item.value as string)"
          />
        </div>
      </template>

      <template #body="{ item }">
        <div class="space-y-1">
          <!-- Inline collection name editor -->
          <div v-if="editingCollectionId === item.value" class="flex items-center gap-2 px-2 py-1.5 mb-2">
            <input
              v-model="editCollectionName"
              class="flex-1 bg-transparent text-sm font-semibold border border-[var(--ui-border-accented)] rounded px-2 py-1 outline-none focus:border-[var(--ui-color-primary-500)]"
              @keydown.enter="saveCollectionName(item.value as string)"
              @keydown.escape="editingCollectionId = null"
              @blur="saveCollectionName(item.value as string)"
            >
          </div>

          <!-- Collection-level validation issues -->
          <div
            v-for="issue in getCollectionIssues(item.value as string).filter(i => !i.fieldId)"
            :key="issue.code"
            class="flex items-center gap-2 text-xs px-2 py-1"
            :class="issue.type === 'error' ? 'text-[var(--ui-color-error-500)]' : 'text-[var(--ui-color-warning-500)]'"
          >
            <UIcon :name="issue.type === 'error' ? 'i-lucide-alert-circle' : 'i-lucide-alert-triangle'" class="size-3 shrink-0" />
            {{ issue.message }}
          </div>

          <!-- Field list with drag-to-reorder -->
          <DesignerFieldList
            :fields="getFields(item.value as string)"
            :collections="collectionsWithFields"
            :collection-id="item.value as string"
            @update-field="handleUpdateField"
            @delete-field="handleDeleteField"
            @add-field="handleAddField(item.value as string)"
            @reorder="(fieldIds) => handleReorderFields(item.value as string, fieldIds)"
          />
        </div>
      </template>
    </UAccordion>
  </div>
</template>
