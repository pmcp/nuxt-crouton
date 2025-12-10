<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch, onBeforeUnmount } from 'vue'
import type { TreeNode as TreeNodeType } from './Tree.vue'
import type SortableType from 'sortablejs'

const treeDrag = useTreeDrag()
const { wasSaved } = useTreeItemState()

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

// Initialize expanded state (expand by default if has children)
treeDrag.initExpanded(props.item.id, (props.item.children?.length ?? 0) > 0)

// Refs
const childrenRef = ref<HTMLElement | null>(null)
let sortableInstance: SortableType | null = null

// Computed
const isExpanded = computed(() => treeDrag.isExpanded(props.item.id))
const isBeingDragged = computed(() => treeDrag.isDragging(props.item.id))

// ============ UI Helpers ============

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

// ============ SortableJS Setup ============

async function initSortable() {
  if (!import.meta.client || !childrenRef.value) return

  // Destroy existing instance
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

        // Only handle if this container is the source
        if (evt.from !== childrenRef.value) return

        const itemId = (evt.item as HTMLElement).dataset.id
        if (!itemId) return

        const toParentId = (evt.to as HTMLElement).dataset.parentId
        const newIndex = evt.newIndex ?? 0

        // Emit move: item, new parent (null for root), new index
        emit('move', itemId, toParentId || null, newIndex)
      },

      // Auto-expand collapsed nodes when dragging over them
      onMove: (evt) => {
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

// ============ Lifecycle ============

watch(isExpanded, async (expanded) => {
  if (expanded) {
    await nextTick()
    initSortable()
  } else {
    sortableInstance?.destroy()
    sortableInstance = null
  }
})

onMounted(async () => {
  if (isExpanded.value) {
    await nextTick()
    initSortable()
  }
})

onBeforeUnmount(() => {
  sortableInstance?.destroy()
  sortableInstance = null
  treeDrag.cancelAutoExpand(props.item.id)
})
</script>

<template>
  <div
    class="tree-node"
    :data-id="item.id"
    :data-depth="depth"
    :class="{ 'opacity-50': isBeingDragged }"
  >
    <!-- Node content row -->
    <div
      class="tree-node-content group relative flex items-center gap-2 min-h-9 py-1.5 px-2 rounded-lg cursor-pointer overflow-hidden transition-colors hover:bg-white/5"
      :class="[wasSaved(item.id) ? 'tree-node-saved' : '']"
      @click="emit('select', item)"
    >
      <!-- Drag handle -->
      <div
        class="drag-handle cursor-grab opacity-40 group-hover:opacity-100 transition-opacity"
        @click.stop
      >
        <UIcon name="i-lucide-grip-vertical" class="size-4 text-muted" />
      </div>

      <!-- Child count / expand toggle -->
      <button
        v-if="item.children?.length"
        class="shrink-0 flex items-center justify-center size-5 text-xs font-medium text-muted tabular-nums rounded-full bg-muted/30 hover:bg-muted/50 transition-colors"
        @click.stop="treeDrag.toggle(item.id)"
      >
        {{ item.children.length }}
      </button>

      <!-- Item icon -->
      <UIcon
        v-if="item.icon"
        :name="item.icon"
        class="size-4 shrink-0 text-muted"
      />

      <!-- Item label -->
      <span class="truncate flex-1 text-sm font-medium">
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
      <div class="opacity-0 group-hover:opacity-100 transition-opacity">
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

    <!-- Children container (SortableJS target) -->
    <div
      v-if="isExpanded"
      ref="childrenRef"
      class="tree-children"
      :data-parent-id="item.id"
    >
      <CroutonTreeNode
        v-for="child in item.children || []"
        :key="child.id"
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
  margin-left: 1.5rem;
  margin-top: 0.25rem;
  padding-left: 0.75rem;
  border-left: 2px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-height: 1.5rem;
}

/* Save animation */
.tree-node-saved::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgb(var(--color-success-500) / 0.25) 50%,
    transparent 100%
  );
  animation: sweep 0.8s ease-out forwards;
}

@keyframes sweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); opacity: 0; }
}
</style>
