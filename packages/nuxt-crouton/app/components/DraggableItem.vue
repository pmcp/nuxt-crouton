<script setup lang="ts">
/**
 * CroutonDraggableItem - Makes collection items draggable for flow integration
 *
 * Wraps any content and makes it draggable using native HTML5 drag-and-drop.
 * The dragged data includes the collection name and item, allowing CroutonFlow
 * to create nodes from dropped items.
 *
 * @example
 * ```vue
 * <CroutonDraggableItem
 *   :item="option"
 *   collection="options"
 * >
 *   <OptionCard :option="option" />
 * </CroutonDraggableItem>
 * ```
 */

interface Props {
  /** The item data to be transferred when dragged */
  item: Record<string, unknown>
  /** The collection name this item belongs to */
  collection: string
  /** Whether dragging is disabled */
  disabled?: boolean
  /** Custom drag image element selector */
  dragImageSelector?: string
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<{
  /** Emitted when drag starts */
  dragStart: [item: Record<string, unknown>, event: DragEvent]
  /** Emitted when drag ends */
  dragEnd: [item: Record<string, unknown>, event: DragEvent]
}>()

// Track dragging state for visual feedback
const isDragging = ref(false)

/**
 * Handle drag start - set transfer data
 */
function handleDragStart(event: DragEvent) {
  if (props.disabled || !event.dataTransfer) return

  isDragging.value = true

  // Set the transfer data in JSON format
  const dragData = {
    type: 'crouton-item',
    collection: props.collection,
    item: props.item,
  }

  event.dataTransfer.setData('application/json', JSON.stringify(dragData))
  event.dataTransfer.effectAllowed = 'move'

  // Set custom drag image if selector provided
  if (props.dragImageSelector) {
    const element = document.querySelector(props.dragImageSelector)
    if (element instanceof HTMLElement) {
      event.dataTransfer.setDragImage(element, 0, 0)
    }
  }

  emit('dragStart', props.item, event)
}

/**
 * Handle drag end - clean up
 */
function handleDragEnd(event: DragEvent) {
  isDragging.value = false
  emit('dragEnd', props.item, event)
}
</script>

<template>
  <div
    :draggable="!disabled"
    class="crouton-draggable-item"
    :class="{
      'crouton-draggable-item--dragging': isDragging,
      'crouton-draggable-item--disabled': disabled,
    }"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <slot :is-dragging="isDragging" />
  </div>
</template>

<style scoped>
.crouton-draggable-item {
  cursor: grab;
  user-select: none;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.crouton-draggable-item:hover {
  transform: translateY(-1px);
}

.crouton-draggable-item:active {
  cursor: grabbing;
}

.crouton-draggable-item--dragging {
  opacity: 0.5;
  transform: scale(0.98);
}

.crouton-draggable-item--disabled {
  cursor: default;
  opacity: 0.6;
}

.crouton-draggable-item--disabled:hover {
  transform: none;
}
</style>
