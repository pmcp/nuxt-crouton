<script setup lang="ts">
import { useSortable } from '@vueuse/integrations/useSortable'
import type { DesignerField } from '~~/layers/designer/collections/fields/types'
import type { CollectionWithFields } from '~/composables/useCollectionEditor'

const props = defineProps<{
  fields: DesignerField[]
  collections: CollectionWithFields[]
  collectionId: string
}>()

const emit = defineEmits<{
  updateField: [fieldId: string, updates: { name?: string, type?: string, meta?: Record<string, any>, refTarget?: string }]
  deleteField: [fieldId: string]
  addField: []
  reorder: [fieldIds: string[]]
}>()

const sortableFields = shallowRef([...props.fields])
const fieldListRef = useTemplateRef<HTMLElement>('fieldList')

// Keep sortableFields in sync with props
watch(() => props.fields, (newFields) => {
  sortableFields.value = [...newFields]
}, { deep: true })

useSortable(fieldListRef, sortableFields, {
  animation: 150,
  handle: '.drag-handle',
  ghostClass: 'opacity-30',
  onEnd: () => {
    const newOrder = sortableFields.value.map(f => f.id)
    emit('reorder', newOrder)
  }
})
</script>

<template>
  <div class="space-y-1">
    <div ref="fieldList">
      <div
        v-for="field in sortableFields"
        :key="field.id"
        class="flex items-center gap-1"
      >
        <!-- Drag handle -->
        <div class="drag-handle cursor-grab active:cursor-grabbing shrink-0 px-0.5 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] opacity-0 hover:opacity-100 transition-opacity">
          <UIcon name="i-lucide-grip-vertical" class="size-3.5" />
        </div>

        <div class="flex-1 min-w-0">
          <DesignerFieldRow
            :field="field"
            :collections="collections"
            @update="(updates) => emit('updateField', field.id, updates)"
            @delete="emit('deleteField', field.id)"
          />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="fields.length === 0" class="py-3 text-center text-sm text-[var(--ui-text-muted)]">
      No fields yet. Add one below.
    </div>

    <!-- Add field button -->
    <div class="pt-2">
      <UButton
        label="Add Field"
        icon="i-lucide-plus"
        variant="ghost"
        size="xs"
        @click="emit('addField')"
      />
    </div>
  </div>
</template>
