<script lang="ts" setup>
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue'
import type { HierarchyConfig } from '../types/table'
import type { TreeNode } from './Tree.vue'
import type SortableType from 'sortablejs'

const { setDragging, wasDropHandledByRow } = useTreeDragState()

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

        const draggedEl = evt.item as HTMLElement
        const itemId = draggedEl.dataset.id
        if (!itemId) return

        const toParentId = (evt.to as HTMLElement).dataset.parentId || null
        const newIndex = evt.newIndex ?? 0

        console.log('[TreeView] Move:', { itemId, toParentId: toParentId || null, newIndex })
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

// Global dragend handler to ensure state is always cleared
function handleGlobalDragEnd() {
  setDragging(null)
}

// Cleanup on unmount
onBeforeUnmount(() => {
  sortableInstance?.destroy()
  sortableInstance = null
  if (import.meta.client) {
    document.removeEventListener('dragend', handleGlobalDragEnd)
  }
})

// Initialize on mount only
onMounted(async () => {
  // Add global dragend listener to ensure state cleanup
  if (import.meta.client) {
    document.addEventListener('dragend', handleGlobalDragEnd)
  }

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
        :key="`${item.id}-${item.parentId}-${item.children?.length || 0}`"
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
  min-height: 3rem;
  padding-bottom: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* Ghost = the placeholder showing where item will drop */
:deep(.tree-ghost) {
  opacity: 0.4;
  background: rgb(var(--ui-primary) / 0.1);
  border-left: 3px solid rgb(var(--ui-primary));
  border-radius: 0.375rem;
}

/* Drag = the item being dragged */
:deep(.tree-drag) {
  background: rgb(var(--ui-bg));
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  border-radius: 0.375rem;
  opacity: 0.95;
}

:deep(.tree-chosen) {
  background: rgb(var(--ui-primary) / 0.05);
}
</style>
