<script setup lang="ts">
import { ref, onMounted, nextTick, watch, onBeforeUnmount } from 'vue'
import type { TreeNode as TreeNodeType } from './Tree.vue'
import type SortableType from 'sortablejs'

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

// Local state
const isExpanded = ref(props.depth < 2)
const childrenRef = ref<HTMLElement | null>(null)
let sortableInstance: SortableType | null = null

function toggle() {
  isExpanded.value = !isExpanded.value
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

  // Already initialized - skip
  if (sortableInstance) return

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
      onEnd: (evt) => {
        // Only emit from the destination container to prevent duplicate events
        if (evt.to !== childrenRef.value) return

        const draggedEl = evt.item as HTMLElement
        const itemId = draggedEl.dataset.id
        if (!itemId) return

        const toParentId = (evt.to as HTMLElement).dataset.parentId || null
        const newIndex = evt.newIndex ?? 0

        // Let SortableJS keep the DOM as-is, just emit the move
        emit('move', itemId, toParentId, newIndex)
      }
    })
  } catch (error) {
    console.warn('Sortable not available for nested tree:', error)
  }
}

function handleItemClick() {
  emit('select', props.item)
}

// Initialize sortable when expanded
watch(isExpanded, async (expanded) => {
  if (expanded && !sortableInstance) {
    await nextTick()
    initSortable()
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
    class="tree-node"
    :data-id="item.id"
    :data-depth="depth"
  >
    <!-- Node content row -->
    <div
      class="tree-node-content group flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
      :style="{ paddingLeft: `${depth * 20 + 8}px` }"
      @click="handleItemClick"
    >
      <!-- Drag handle -->
      <div
        class="drag-handle cursor-grab opacity-40 hover:opacity-100 transition-opacity"
        @mousedown.stop
        @click.stop
      >
        <UIcon name="i-lucide-grip-vertical" class="size-4" />
      </div>

      <!-- Expand/collapse toggle -->
      <button
        v-if="item.children?.length"
        class="shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
        @click.stop="toggle"
      >
        <UIcon
          :name="isExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
          class="size-4 text-muted"
        />
      </button>
      <div v-else class="w-5" />

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
        size="xs"
        variant="subtle"
      >
        {{ item.status }}
      </UBadge>

      <!-- Children count -->
      <UBadge
        v-if="item.children?.length"
        color="neutral"
        size="xs"
        variant="subtle"
      >
        {{ item.children.length }}
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

    <!-- Children container -->
    <div
      v-if="isExpanded"
      ref="childrenRef"
      class="tree-children"
      :class="{ 'tree-children-empty': !item.children?.length }"
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
  min-height: 8px;
}

/* Empty children container - show drop zone */
.tree-children-empty {
  min-height: 28px;
  margin-left: 28px;
  border: 2px dashed rgb(var(--color-neutral-200));
  border-radius: 0.375rem;
  transition: all 0.15s ease;
}

.tree-children-empty:hover {
  border-color: rgb(var(--color-primary-400));
  background: rgb(var(--color-primary-50));
}

/* Drag states are defined in TreeView.vue and apply via :deep() */
</style>
