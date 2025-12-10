<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch, onBeforeUnmount } from 'vue'
import type { TreeNode as TreeNodeType } from './Tree.vue'
import type SortableType from 'sortablejs'

const { setDragging, getDraggingId, draggingId, hoveringOverId, setHoveringOver, setDropHandledByRow, wasDropHandledByRow, isItemExpanded, initItemExpanded, markCollapsed, markExpanded } = useTreeDragState()

interface Props {
  item: TreeNodeType
  depth?: number
  labelKey?: string
  collection: string
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
  labelKey: 'name'
})

const emit = defineEmits<{
  move: [id: string, newParentId: string | null, newOrder: number]
  select: [item: TreeNodeType]
}>()

// Initialize expanded state on first render (only if not already tracked)
initItemExpanded(props.item.id, (props.item.children?.length ?? 0) > 0)

// Use external expanded state - persists across moves
const isExpanded = computed(() => isItemExpanded(props.item.id))
const childrenRef = ref<HTMLElement | null>(null)
const nodeRef = ref<HTMLElement | null>(null)
let sortableInstance: SortableType | null = null
let expandTimeout: ReturnType<typeof setTimeout> | null = null
let wasExpandedByDrag = false

// Computed: is this item being hovered over during drag?
const isDragOver = computed(() => hoveringOverId.value === props.item.id)

function toggle() {
  if (isExpanded.value) {
    markCollapsed(props.item.id)
  } else {
    markExpanded(props.item.id)
  }
  wasExpandedByDrag = false // Manual toggle resets the flag
}

// Handle drag over on the content row - stop propagation to prevent parent from triggering
function handleDragOver(e: DragEvent) {
  e.preventDefault() // Required to allow drop
  e.stopPropagation() // Prevent parent nodes from receiving this event

  // Only update if not already hovering this item
  if (hoveringOverId.value !== props.item.id) {
    setHoveringOver(props.item.id)

    // Clear any existing expand timeout from other items
    if (expandTimeout) {
      clearTimeout(expandTimeout)
      expandTimeout = null
    }

    // Start auto-expand timer if not already expanded
    if (!isExpanded.value) {
      expandTimeout = setTimeout(() => {
        wasExpandedByDrag = true
        markExpanded(props.item.id)
      }, 500)
    }
  }
}

function handleDragLeave(e: DragEvent) {
  // Only handle if actually leaving this node (not entering a child)
  if (nodeRef.value?.contains(e.relatedTarget as Node)) return
  resetDragState()
}

function handleDrop() {
  // Clear drag state
  setDragging(null)

  // Don't auto-close on drop - user intentionally dropped here
  wasExpandedByDrag = false
  if (expandTimeout) {
    clearTimeout(expandTimeout)
    expandTimeout = null
  }
}

function handleDropOnRow(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()

  const draggedId = getDraggingId()

  // Can't drop on self - just clear state and return
  if (!draggedId || draggedId === props.item.id) {
    setDropHandledByRow(true) // Prevent SortableJS from handling
    setDragging(null)
    return
  }

  // Mark that we handled this drop (so SortableJS onEnd skips)
  setDropHandledByRow(true)

  // Add as last child of this item
  const newOrder = props.item.children?.length ?? 0
  emit('move', draggedId, props.item.id, newOrder)

  // Clear drag state
  setDragging(null)

  // Expand to show the dropped item
  markExpanded(props.item.id)
  wasExpandedByDrag = false
}

function resetDragState() {
  if (expandTimeout) {
    clearTimeout(expandTimeout)
    expandTimeout = null
  }
  // Auto-close if it was expanded by drag (only on leave, not drop)
  if (wasExpandedByDrag) {
    wasExpandedByDrag = false
    markCollapsed(props.item.id)
  }
}

function getItemLabel(item: TreeNodeType): string {
  return item[props.labelKey] || item.name || item.title || item.label || item.id
}

function getStatusColor(status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    published: 'success',
    active: 'success',
    draft: 'warning',
    pending: 'warning',
    archived: 'neutral',
    deleted: 'error',
    error: 'error'
  }
  return statusColors[status?.toLowerCase()] || 'neutral'
}

function getItemActions(item: TreeNodeType) {
  return [
    [
      {
        label: 'Edit',
        icon: 'i-lucide-pencil',
        onSelect: () => emit('select', item)
      },
      {
        label: 'Add child',
        icon: 'i-lucide-plus',
        onSelect: () => {
          console.log('Add child to:', item.id)
        }
      }
    ],
    [
      {
        label: 'Move up',
        icon: 'i-lucide-arrow-up',
        disabled: item.order === 0,
        onSelect: () => {
          if (item.order > 0) {
            emit('move', item.id, item.parentId, item.order - 1)
          }
        }
      },
      {
        label: 'Move down',
        icon: 'i-lucide-arrow-down',
        onSelect: () => {
          emit('move', item.id, item.parentId, item.order + 1)
        }
      }
    ],
    [
      {
        label: 'Move to root',
        icon: 'i-lucide-corner-left-up',
        disabled: !item.parentId,
        onSelect: () => {
          if (item.parentId) {
            emit('move', item.id, null, 0)
          }
        }
      }
    ]
  ]
}

async function initSortable() {
  if (!import.meta.client || !childrenRef.value) return

  // Destroy existing instance before creating new one (in case DOM changed)
  if (sortableInstance) {
    sortableInstance.destroy()
    sortableInstance = null
  }

  try {
    const { default: Sortable } = await import('sortablejs')

    sortableInstance = new Sortable(childrenRef.value, {
      group: 'tree',
      animation: 150,
      fallbackOnBody: true,
      swapThreshold: 0.5,
      invertSwap: true,
      emptyInsertThreshold: 10,
      dragoverBubble: false,
      handle: '.drag-handle',
      ghostClass: 'tree-ghost',
      chosenClass: 'tree-chosen',
      dragClass: 'tree-drag',
      onStart: (evt) => {
        const draggedEl = evt.item as HTMLElement
        setDragging(draggedEl.dataset.id || null)
      },
      onEnd: (evt) => {
        // Skip if drop was already handled by row drop handler
        if (wasDropHandledByRow()) {
          setDragging(null)
          return
        }

        setDragging(null)

        // TreeNode sortables only handle moves that START from this container
        // (dragging a child OUT of this node)
        if (evt.from !== childrenRef.value) return

        const draggedEl = evt.item as HTMLElement
        const itemId = draggedEl.dataset.id
        if (!itemId) return

        const toParentId = (evt.to as HTMLElement).dataset.parentId || null
        const newIndex = evt.newIndex ?? 0

        console.log('[TreeNode] Move from children:', { itemId, toParentId: toParentId || null, newIndex })
        emit('move', itemId, toParentId === '' ? null : toParentId, newIndex)
      }
    })
  } catch (error) {
    console.warn('Sortable not available for nested tree:', error)
  }
}

function handleItemClick() {
  emit('select', props.item)
}

// Initialize/destroy sortable when expanded/collapsed
watch(isExpanded, async (expanded) => {
  if (expanded) {
    await nextTick()
    initSortable()
  } else {
    // Destroy sortable when collapsing so it can be re-created on expand
    sortableInstance?.destroy()
    sortableInstance = null
  }
})

// Cleanup on unmount
onBeforeUnmount(() => {
  sortableInstance?.destroy()
  sortableInstance = null
})

// Initialize on mount if expanded
onMounted(async () => {
  if (isExpanded.value) {
    await nextTick()
    initSortable()
  }
})
</script>

<template>
  <div
    ref="nodeRef"
    class="tree-node"
    :data-id="item.id"
    :data-depth="depth"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- Node content row -->
    <div
      class="tree-node-content group flex items-center gap-2 py-1.5 px-2 rounded-md bg-elevated hover:bg-accented cursor-pointer transition-colors"
      :class="{ 'ring-2 ring-primary/50': isDragOver }"
      @click="handleItemClick"
      @drop="handleDropOnRow"
      @dragover="handleDragOver"
    >
      <!-- Drag handle -->
      <div
        class="drag-handle cursor-grab opacity-40 hover:opacity-100 transition-opacity"
        @mousedown.stop
        @click.stop
      >
        <UIcon name="i-lucide-grip-vertical" class="size-4" />
      </div>

      <!-- Expand/collapse toggle - always show to allow nesting -->
      <button
        class="shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
        @click.stop="toggle"
      >
        <UIcon
          :name="isExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
          class="size-4"
          :class="item.children?.length ? 'text-muted' : 'text-muted/30'"
        />
      </button>

      <!-- Children count -->
      <UBadge
        v-if="item.children?.length"
        color="neutral"
        size="sm"
        variant="subtle"
      >
        {{ item.children.length }}
      </UBadge>

      <!-- Item icon if provided -->
      <UIcon
        v-if="item.icon"
        :name="item.icon"
        class="size-4 shrink-0 text-muted"
      />

      <!-- Item label -->
      <span class="truncate flex-1 text-sm">
        {{ getItemLabel(item) }}
      </span>

      <!-- Status badge -->
      <UBadge
        v-if="item.status"
        :color="getStatusColor(item.status)"
        size="sm"
        variant="subtle"
      >
        {{ item.status }}
      </UBadge>

      <!-- Actions dropdown -->
      <div class="tree-item-actions opacity-0 group-hover:opacity-100 transition-opacity">
        <UDropdownMenu
          :items="getItemActions(item)"
          :content="{ align: 'end' }"
        >
          <UButton
            icon="i-lucide-more-horizontal"
            color="neutral"
            variant="ghost"
            size="xs"
            @click.stop
          />
        </UDropdownMenu>
      </div>
    </div>

    <!-- Children container - only render if there are children -->
    <div
      v-if="isExpanded && item.children?.length"
      ref="childrenRef"
      class="tree-children"
      :data-parent-id="item.id"
    >
      <CroutonTreeNode
        v-for="child in item.children || []"
        :key="`${child.id}-${child.parentId}-${child.children?.length || 0}`"
        :item="child"
        :depth="depth + 1"
        :label-key="labelKey"
        :collection="collection"
        @move="(id, parentId, order) => emit('move', id, parentId, order)"
        @select="emit('select', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.tree-children {
  margin-left: 2rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  padding-left: 1rem;
  border-left: 2px solid rgba(128, 128, 128, 0.2);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

</style>
