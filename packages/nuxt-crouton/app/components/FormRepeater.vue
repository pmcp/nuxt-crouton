<script setup lang="ts">
import { nanoid } from 'nanoid'
import { useSortable } from '@vueuse/integrations/useSortable'
import type { SortableEvent } from 'sortablejs'

interface Props {
  modelValue: any[] | null
  componentName: string
  addLabel?: string
  sortable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  addLabel: 'Add Item',
  sortable: true
})

const emit = defineEmits<{
  'update:modelValue': [value: any[]]
}>()

// Use ref for useSortable compatibility (per VueUse docs)
const items = ref<any[]>(props.modelValue || [])

const containerRef = ref<HTMLElement>()

// Track if we're currently emitting to prevent sync loops
const isEmitting = ref(false)

// Enable drag-to-reorder - useSortable mutates items ref directly on drag
useSortable(containerRef, items, {
  animation: 200,
  handle: '.drag-handle',
  ghostClass: 'opacity-50',
  disabled: !props.sortable,
  onUpdate: (event: SortableEvent) => {
    isEmitting.value = true

    // Get the reordered array from the event
    const reordered = [...items.value]
    const movedItem = reordered.splice(event.oldIndex!, 1)[0]
    reordered.splice(event.newIndex!, 0, movedItem)

    items.value = reordered
    emit('update:modelValue', reordered)

    nextTick(() => {
      isEmitting.value = false
    })
  }
})

// Watch for external changes to props.modelValue and sync to items ref
// BUT don't break useSortable by creating new array references during our own emissions
watch(() => props.modelValue, (newVal) => {
  if (newVal && !isEmitting.value) {
    // Diagnostic logging to debug JSON parsing issues
    console.log('[CroutonFormRepeater] External modelValue synced:', {
      type: typeof newVal,
      isArray: Array.isArray(newVal),
      value: newVal,
      length: newVal?.length
    })
    // Only sync if this is a true external change (not from our own emit)
    items.value = [...newVal]
  }
}, { deep: true })

const addItem = () => {
  const newItem = { id: nanoid() }
  console.log('[CroutonFormRepeater] Adding item:', {
    componentName: props.componentName,
    newItem,
    currentCount: items.value.length
  })
  items.value = [...items.value, newItem]
  emit('update:modelValue', items.value)
}

const removeItem = (index: number) => {
  const itemToRemove = items.value[index]
  console.log('[CroutonFormRepeater] Removing item:', {
    componentName: props.componentName,
    index,
    item: itemToRemove,
    currentCount: items.value.length
  })
  items.value = items.value.filter((_, i) => i !== index)
  emit('update:modelValue', items.value)
}

const updateItem = (index: number, val: any) => {
  console.log('[CroutonFormRepeater] Updating item:', {
    componentName: props.componentName,
    index,
    oldValue: items.value[index],
    newValue: val
  })
  const newItems = [...items.value]
  newItems[index] = val
  items.value = newItems
  emit('update:modelValue', items.value)
}

// Check if component can be resolved
const componentResolved = computed(() => {
  try {
    // Try to resolve the component - this will work for auto-imported components
    const component = resolveComponent(props.componentName, false)
    return component !== props.componentName // If resolved, it returns the component, not the string
  } catch (e) {
    return false
  }
})

// Log component initialization
onMounted(() => {
  console.log('[CroutonFormRepeater] Component mounted:', {
    componentName: props.componentName,
    sortable: props.sortable,
    initialItemCount: items.value.length,
    addLabel: props.addLabel,
    componentResolved: componentResolved.value
  })

  // Diagnostic logging to debug JSON parsing issues
  console.log('[CroutonFormRepeater] Initial modelValue:', {
    type: typeof props.modelValue,
    isArray: Array.isArray(props.modelValue),
    value: props.modelValue,
    length: props.modelValue?.length
  })

  if (!componentResolved.value) {
    console.warn(`[CroutonFormRepeater] Warning: Component "${props.componentName}" may not be resolved correctly. Check that:
1. The component is registered globally
2. The component name matches the registered name (including any prefixes)
3. Auto-imports are configured correctly`)
  }
})
</script>

<template>
  <!-- Empty state -->
  <UCard v-if="items.length === 0">
    <div class="text-center text-gray-500">
      No items yet. Click "{{ addLabel }}" to get started.
    </div>
  </UCard>

  <!-- Items list -->
  <div
    ref="containerRef"
    class="space-y-2 mb-3"
  >
    <UCard
      v-for="(item, index) in items"
      :key="item.id || index"
      :ui="{ body: 'sm:p-2 p-2' }"
    >
      <div class="flex gap-2 justify-between">
        <!-- Drag handle (only if sortable) -->
        <UButton
          v-if="sortable"
          type="button"
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-grip-vertical"
          class="drag-handle cursor-move"
          aria-label="Drag to reorder"
        />

        <!-- Remove button -->
        <UButton
          type="button"
          color="error"
          variant="ghost"
          size="sm"
          icon="i-lucide-x"
          aria-label="Remove item"
          @click="removeItem(index)"
        />
      </div>

      <!-- Item component -->
      <div class="p-2">
        <component
          :is="componentName"
          :model-value="item"
          @update:model-value="(val: unknown) => updateItem(index, val)"
        />
      </div>
    </UCard>
  </div>

  <!-- Add button -->
  <UButton
    type="button"
    color="primary"
    variant="outline"
    block
    @click="addItem"
  >
    <template #leading>
      <UIcon name="i-lucide-plus" />
    </template>
    {{ addLabel }}
  </UButton>
</template>
