<script setup lang="ts">
import type { FieldType } from '~/types/schema'

const { FIELD_TYPES } = useFieldTypes()
const { addField } = useSchemaDesigner()

const searchQuery = ref('')

const filteredTypes = computed(() => {
  if (!searchQuery.value) return FIELD_TYPES
  const q = searchQuery.value.toLowerCase()
  return FIELD_TYPES.filter(
    ft => ft.label.toLowerCase().includes(q) || ft.type.includes(q) || ft.description.toLowerCase().includes(q)
  )
})

function onDragStart(event: DragEvent, type: FieldType) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('field-type', type)
    event.dataTransfer.effectAllowed = 'copy'
  }
}

function handleClick(type: FieldType) {
  addField(type)
}
</script>

<template>
  <div class="p-4 space-y-4">
    <div>
      <h2 class="text-sm font-semibold text-[var(--ui-text-muted)] uppercase tracking-wide mb-2">
        Field Types
      </h2>
      <UInput
        v-model="searchQuery"
        placeholder="Search fields..."
        icon="i-lucide-search"
        size="sm"
      />
    </div>

    <div class="space-y-1">
      <button
        v-for="fieldType in filteredTypes"
        :key="fieldType.type"
        draggable="true"
        class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors
               hover:bg-[var(--ui-bg-elevated-hover)] cursor-grab active:cursor-grabbing
               border border-transparent hover:border-[var(--ui-border)]"
        @dragstart="onDragStart($event, fieldType.type)"
        @click="handleClick(fieldType.type)"
      >
        <UIcon
          :name="fieldType.icon"
          class="text-lg text-[var(--ui-text-muted)]"
        />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium">{{ fieldType.label }}</div>
          <div class="text-xs text-[var(--ui-text-muted)] truncate">
            {{ fieldType.description }}
          </div>
        </div>
        <UIcon
          name="i-lucide-plus"
          class="text-[var(--ui-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </button>
    </div>

    <USeparator />

    <div class="text-xs text-[var(--ui-text-muted)]">
      <p>Click or drag a field type to add it to your schema.</p>
    </div>
  </div>
</template>
