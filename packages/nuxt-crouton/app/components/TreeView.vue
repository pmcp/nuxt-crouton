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

      onStart: (evt) => {
        const id = (evt.item as HTMLElement).dataset.id
        if (id) treeDrag.startDrag(id)
      },

      onEnd: (evt) => {
        treeDrag.endDrag()

        const itemId = (evt.item as HTMLElement).dataset.id
        if (!itemId) return

        const toParentId = (evt.to as HTMLElement).dataset.parentId
        const newIndex = evt.newIndex ?? 0

        emit('move', itemId, toParentId || null, newIndex)
      },

      // Track drop target for line highlighting + auto-expand
      onMove: (evt) => {
        const toContainer = evt.to as HTMLElement
        const parentId = toContainer.dataset.parentId
        // Set drop target (empty string = root, so use null for that)
        treeDrag.setDropTarget(parentId || null)

        // Auto-expand collapsed nodes
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
  <div class="crouton-tree-view">
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
</template>

<style scoped>
.crouton-tree-view {
  width: 100%;
}

.tree-root {
  min-height: 3rem;
  padding-top: 0.5rem;
  padding-bottom: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

:deep(.tree-ghost) {
  opacity: 0.4;
  background: rgb(var(--ui-primary) / 0.1);
  border-left: 3px solid rgb(var(--ui-primary));
  border-radius: 0.375rem;
}

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
