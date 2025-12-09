<script lang="ts" setup>
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue'
import type { HierarchyConfig } from '../types/table'
import type { TreeNode } from './Tree.vue'
import type SortableType from 'sortablejs'

interface Props {
  items: TreeNode[]
  collection: string
  hierarchy: HierarchyConfig
  labelKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  hierarchy: () => ({ enabled: true }),
  labelKey: 'name'
})

const emit = defineEmits<{
  move: [id: string, newParentId: string | null, newOrder: number]
  select: [item: TreeNode]
}>()

// Root container ref
const rootRef = ref<HTMLElement | null>(null)

// Track sortable instance (non-reactive, no need for shallowRef)
let sortableInstance: SortableType | null = null

// Initialize sortable for root level
async function initRootSortable() {
  if (!import.meta.client || !rootRef.value) return

  // Already initialized - skip
  if (sortableInstance) return

  try {
    const { default: Sortable } = await import('sortablejs')

    sortableInstance = new Sortable(rootRef.value, {
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
      onEnd: (evt) => {
        // Only emit from the destination container to prevent duplicate events
        if (evt.to !== rootRef.value) return

        const draggedEl = evt.item as HTMLElement
        const itemId = draggedEl.dataset.id
        if (!itemId) return

        const toParentId = (evt.to as HTMLElement).dataset.parentId || null
        const newIndex = evt.newIndex ?? 0

        // Let SortableJS keep the DOM as-is, just emit the move
        emit('move', itemId, toParentId === '' ? null : toParentId, newIndex)
      }
    })
  } catch (error) {
    console.warn('Sortable not available:', error)
  }
}

// Handle move events from child TreeNode components
function handleMove(id: string, newParentId: string | null, newOrder: number) {
  emit('move', id, newParentId, newOrder)
}

// Handle select events from child TreeNode components
function handleSelect(item: TreeNode) {
  emit('select', item)
}

// Cleanup on unmount
onBeforeUnmount(() => {
  sortableInstance?.destroy()
  sortableInstance = null
})

// Initialize on mount only
onMounted(async () => {
  await nextTick()
  initRootSortable()
})
</script>

<template>
  <div class="crouton-tree-view">
    <!-- Root container -->
    <div
      v-if="items.length > 0"
      ref="rootRef"
      class="tree-root"
      data-parent-id=""
    >
      <CroutonTreeNode
        v-for="item in items"
        :key="item.id"
        :item="item"
        :depth="0"
        :label-key="labelKey"
        :collection="collection"
        @move="handleMove"
        @select="handleSelect"
      />
    </div>

    <!-- Empty state -->
    <div v-else class="text-center text-muted p-8">
      <UIcon name="i-lucide-git-branch" class="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p class="text-lg font-medium mb-2">No items yet</p>
      <p class="text-sm">Create your first item to see the tree structure.</p>
    </div>
  </div>
</template>

<style scoped>
.crouton-tree-view {
  width: 100%;
}

.tree-root {
  min-height: 50px;
  padding-bottom: 40px; /* Drop zone at bottom for dragging items to end of list */
}

/* Ghost = the placeholder showing where item will drop */
:deep(.tree-ghost) {
  background: transparent !important;
  border: 2px dashed #3b82f6 !important;
  border-radius: 0.375rem;
}

:deep(.tree-ghost > *) {
  visibility: hidden;
}

/* Drag = the item being dragged */
:deep(.tree-drag) {
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 0.375rem;
}
</style>
