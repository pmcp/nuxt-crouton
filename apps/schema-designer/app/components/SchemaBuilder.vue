<script setup lang="ts">
import type { FieldType } from '~/types/schema'

const {
  state,
  addField,
  setCollectionName,
  setLayerName,
  setOptions,
  moveField
} = useSchemaDesigner()

// Handle drop from catalog
function onDrop(event: DragEvent) {
  event.preventDefault()
  const fieldType = event.dataTransfer?.getData('field-type') as FieldType
  if (fieldType) {
    addField(fieldType)
  }
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}

// Handle field reordering
const draggedIndex = ref<number | null>(null)

function onFieldDragStart(index: number) {
  draggedIndex.value = index
}

function onFieldDragOver(event: DragEvent, index: number) {
  event.preventDefault()
  if (draggedIndex.value !== null && draggedIndex.value !== index) {
    moveField(draggedIndex.value, index)
    draggedIndex.value = index
  }
}

function onFieldDragEnd() {
  draggedIndex.value = null
}
</script>

<template>
  <div class="p-6 space-y-6 max-w-2xl mx-auto">
    <!-- Collection Settings -->
    <div class="space-y-4">
      <h2 class="text-lg font-semibold">Collection Settings</h2>

      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Collection Name" required>
          <UInput
            :model-value="state.collectionName"
            placeholder="e.g., products"
            @update:model-value="setCollectionName"
          />
        </UFormField>

        <UFormField label="Layer Name" required>
          <UInput
            :model-value="state.layerName"
            placeholder="e.g., shop"
            @update:model-value="setLayerName"
          />
        </UFormField>
      </div>

      <div class="flex flex-wrap gap-4">
        <USwitch
          :model-value="state.options.hierarchy"
          label="Hierarchy (tree structure)"
          @update:model-value="(v: boolean) => setOptions({ hierarchy: v })"
        />
        <USwitch
          :model-value="state.options.sortable"
          label="Sortable (drag to reorder)"
          @update:model-value="(v: boolean) => setOptions({ sortable: v })"
        />
        <USwitch
          :model-value="state.options.translatable"
          label="Translatable (i18n)"
          @update:model-value="(v: boolean) => setOptions({ translatable: v })"
        />
        <USwitch
          :model-value="state.options.seed"
          label="Generate seed data"
          @update:model-value="(v: boolean) => setOptions({ seed: v })"
        />
      </div>
    </div>

    <USeparator />

    <!-- Fields List -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Fields</h2>
        <UBadge color="neutral" variant="subtle">
          {{ state.fields.length }} field{{ state.fields.length === 1 ? '' : 's' }}
        </UBadge>
      </div>

      <!-- Fields -->
      <div
        v-if="state.fields.length > 0"
        class="space-y-2"
      >
        <FieldItem
          v-for="(field, index) in state.fields"
          :key="field.id"
          :field="field"
          :index="index"
          draggable="true"
          @dragstart="onFieldDragStart(index)"
          @dragover="onFieldDragOver($event, index)"
          @dragend="onFieldDragEnd"
        />
      </div>

      <!-- Drop Zone -->
      <div
        class="border-2 border-dashed border-[var(--ui-border)] rounded-lg p-8 text-center
               transition-colors hover:border-[var(--ui-primary)] hover:bg-[var(--ui-bg-elevated)]"
        @drop="onDrop"
        @dragover="onDragOver"
      >
        <UIcon name="i-lucide-plus-circle" class="text-3xl text-[var(--ui-text-muted)] mb-2" />
        <p class="text-sm text-[var(--ui-text-muted)]">
          Drag a field type here or click one in the sidebar
        </p>
      </div>
    </div>
  </div>

  <!-- Field Editor Slideover -->
  <FieldEditor />
</template>
