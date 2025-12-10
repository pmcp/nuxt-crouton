<script lang="ts" setup>
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue'
import type { HierarchyConfig } from '../types/table'
import type { TreeNode } from './Tree.vue'
import type SortableType from 'sortablejs'

const treeDrag = useTreeDrag()

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

const rootRef = ref<HTMLElement | null>(null)
let sortableInstance: SortableType | null = null

async function initRootSortable() {
  if (!import.meta.client || !rootRef.value) return
  if (sortableInstance) return

  try {
    const { default: Sortable } = await import('sortablejs')

    sortableInstance = new Sortable(rootRef.value, {
      group: 'tree',
      animation: 150,
      fallbackOnBody: true,
      swapThreshold: 0.65,
      handle: '.drag-handle',
      ghostClass: 'tree-ghost',
      chosenClass: 'tree-chosen',
      dragClass: 'tree-drag',
      forceFallback: true,
      removeCloneOnHide: true,

      onStart: (evt) => {
        console.log('[sortable:root] onStart', { item: evt.item.dataset.id })
        const id = (evt.item as HTMLElement).dataset.id
        if (id) treeDrag.startDrag(id)
      },

      onEnd: (evt) => {
        console.log('[sortable:root] onEnd', {
          item: evt.item.dataset.id,
          from: evt.from.dataset.parentId,
          to: evt.to?.dataset.parentId,
          oldIndex: evt.oldIndex,
          newIndex: evt.newIndex
        })
        treeDrag.endDrag()

        const itemId = (evt.item as HTMLElement).dataset.id
        if (!itemId) return

        const toParentId = (evt.to as HTMLElement).dataset.parentId
        const newIndex = evt.newIndex ?? 0

        emit('move', itemId, toParentId || null, newIndex)
      },

      onUnchoose: (evt) => {
        console.log('[sortable:root] onUnchoose', { item: evt.item.dataset.id })
      },

      onSort: (evt) => {
        console.log('[sortable:root] onSort', { item: evt.item.dataset.id, newIndex: evt.newIndex })
      },

      // Track drop target for line highlighting + auto-expand
      // Return false to prevent invalid drops (circular references)
      onMove: (evt) => {
        const toContainer = evt.to as HTMLElement

        // Prevent dropping an item into its own descendants
        if (treeDrag.isDescendantDrop(toContainer)) {
          console.log('[sortable:root] onMove BLOCKED - would create circular reference')
          return false
        }

        const parentId = toContainer.dataset.parentId
        treeDrag.setDropTarget(parentId || null)

        // Schedule auto-expand for collapsed nodes (500ms delay in composable)
        const related = evt.related as HTMLElement
        const relatedNode = related.closest('[data-id]') as HTMLElement | null
        if (relatedNode?.dataset.id) {
          treeDrag.scheduleAutoExpand(relatedNode.dataset.id)
        }
        return true
      }
    })
  } catch (error) {
    console.warn('Sortable not available:', error)
  }
}

// Global dragend to ensure cleanup
function handleGlobalDragEnd() {
  treeDrag.endDrag()
}

onBeforeUnmount(() => {
  sortableInstance?.destroy()
  sortableInstance = null
  if (import.meta.client) {
    document.removeEventListener('dragend', handleGlobalDragEnd)
  }
})

onMounted(async () => {
  if (import.meta.client) {
    document.addEventListener('dragend', handleGlobalDragEnd)
  }
  await nextTick()
  initRootSortable()
})
</script>

<template>
  <ClientOnly>
    <div class="w-full">
      <div
        v-if="items.length > 0"
        ref="rootRef"
        class="min-h-12 pt-2 pb-16 flex flex-col gap-1"
        data-parent-id=""
      >
        <CroutonTreeNode
          v-for="item in items"
          :key="item.id"
          :item="item"
          :depth="0"
          :label-key="labelKey"
          :collection="collection"
          @move="(id, parentId, order) => emit('move', id, parentId, order)"
          @select="emit('select', $event)"
        />
      </div>

      <!-- Empty state -->
      <div v-else class="text-center text-muted p-8">
        <UIcon name="i-lucide-git-branch" class="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p class="text-lg font-medium mb-2">No items yet</p>
        <p class="text-sm">Create your first item to see the tree structure.</p>
      </div>
    </div>

    <template #fallback>
      <div class="w-full min-h-12 pt-2 pb-10">
        <USkeleton class="h-10 w-full mb-1" />
        <USkeleton class="h-10 w-full mb-1" />
        <USkeleton class="h-10 w-full" />
      </div>
    </template>
  </ClientOnly>
</template>

<style>
/* SortableJS dynamic classes - must be global (not scoped) */

/* Ghost = placeholder showing where item will drop */
.tree-ghost {
  opacity: 0.5;
  border-radius: 0.375rem;
  background-color: color-mix(in oklch, var(--ui-primary) 10%, transparent);
  margin: 0;
  padding: 0;
  max-height: 2.5rem;
  overflow: hidden;
}

/* Drag = the element being dragged (follows cursor) */
.tree-drag {
  background-color: var(--ui-bg);
  box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.25);
  opacity: 0.85;
}

/* Chosen = the original element that was picked up */
.tree-chosen {
  opacity: 0.4;
}
</style>
