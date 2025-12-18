<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onBeforeUnmount } from 'vue'
import type { Component } from 'vue'
import type { TreeNode as TreeNodeType } from './Tree.vue'
import type SortableType from 'sortablejs'
import type { SortableEvent, MoveEvent } from 'sortablejs'
const { open } = useCrouton()

const treeDrag = useTreeDrag()
const { wasSaved } = useTreeItemState()

interface Props {
  item: TreeNodeType
  depth?: number
  labelKey?: string
  collection: string
  cardComponent?: Component | null
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
  labelKey: 'name',
  collection: '',
  cardComponent: null
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
const isDropTarget = computed(() => treeDrag.isDropTarget(props.item.id))
const hasChildren = computed(() => (props.item.children?.length ?? 0) > 0)
const childCount = computed(() => props.item.children?.length ?? 0)

// Collapse when children become empty
watch(hasChildren, (has) => {
  if (!has && isExpanded.value) {
    treeDrag.setExpanded(props.item.id, false)
  }
})

// Flash animation state from global composable (triggered by useTreeMutation)
const { flashingCounts } = useTreeItemState()
const isCountFlashing = computed(() => !!flashingCounts.value[props.item.id])

// ============ UI Helpers ============

function getItemLabel(item: TreeNodeType): string {
  return item[props.labelKey] || item.name || item.title || item.label || item.id
}

function getStatusColor(status: string): 'primary' | 'warning' | 'error' | 'info' | 'neutral' {
  const statusColors: Record<string, 'primary' | 'warning' | 'error' | 'info' | 'neutral'> = {
    published: 'primary',
    active: 'primary',
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
        onSelect: () => open('update', props.collection, [item.id])
      },
      // {
      //   label: 'Add child',
      //   icon: 'i-lucide-plus',
      //   onSelect: () => {
      //     console.log('Add child to:', item.id)
      //   }
      // }
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
      forceFallback: true,
      removeCloneOnHide: true,

      onStart: (evt: SortableEvent) => {
        const id = (evt.item as HTMLElement).dataset.id
        if (id) treeDrag.startDrag(id)
      },

      onEnd: (evt: SortableEvent) => {
        // Check if the move was blocked by onMove
        const wasBlocked = treeDrag.isMoveBlocked()

        treeDrag.endDrag()

        // If the move was blocked, don't emit
        if (wasBlocked) {
          return
        }

        // Only handle if this container is the source
        if (evt.from !== childrenRef.value) return

        const itemId = (evt.item as HTMLElement).dataset.id
        if (!itemId) return

        const toParentId = (evt.to as HTMLElement).dataset.parentId
        const newIndex = evt.newIndex ?? 0

        // Emit move: item, new parent (null for root), new index
        emit('move', itemId, toParentId || null, newIndex)
      },

      // Track drop target for line highlighting + auto-expand
      // Return false to prevent invalid drops (circular references)
      onMove: (evt: MoveEvent) => {
        const toContainer = evt.to as HTMLElement

        // Prevent dropping an item into its own descendants
        const shouldBlock = treeDrag.isDescendantDrop(toContainer)

        // Track the block state for onEnd to check
        treeDrag.setMoveBlocked(shouldBlock)

        if (shouldBlock) {
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

// ============ Lifecycle ============

// Show children container when expanded OR when dragging (for empty items)
const showChildren = computed(() => hasChildren.value ? isExpanded.value : treeDrag.isDragging())

watch(showChildren, async (show) => {
  if (show) {
    await nextTick()
    initSortable()
  } else {
    sortableInstance?.destroy()
    sortableInstance = null
  }
})

onMounted(async () => {
  if (showChildren.value) {
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
    :data-path="item.path"
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
        v-if="hasChildren"
        class="shrink-0 flex items-center justify-center size-6 text-xs font-semibold tabular-nums rounded-full transition-colors duration-200"
        :class="[
          isCountFlashing
            ? 'count-pulse bg-primary text-primary-foreground'
            : 'bg-elevated text-muted hover:bg-accented hover:text-default'
        ]"
        @click.stop="treeDrag.toggle(item.id)"
      >
        {{ childCount }}
      </button>

      <!-- Custom card content OR default -->
      <template v-if="cardComponent">
        <component
          :is="cardComponent"
          :item="item"
          layout="tree"
          :collection="collection"
          class="flex-1 min-w-0"
        />
      </template>
      <template v-else>
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
      </template>

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
      v-if="showChildren"
      ref="childrenRef"
      class="tree-children mt-1 pl-3 gap-1 min-h-6 border-l-2 border-white/10 transition-colors duration-200 flex flex-col"
      style="margin-left: 1.7em"
      :class="[
        isDropTarget ? 'border-l-[var(--ui-primary)]' : '',
        !hasChildren ? 'min-h-2 !border-transparent' : ''
      ]"
      :data-parent-id="item.id"
    >
      <CroutonTreeNode
        v-for="child in item.children || []"
        :key="child.id"
        :item="child"
        :depth="depth + 1"
        :label-key="labelKey"
        :collection="collection"
        :card-component="cardComponent"
        @move="(id, parentId, order) => emit('move', id, parentId, order)"
        @select="emit('select', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
/* Save animation - sweep effect when item is saved */
.tree-node-saved::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in oklch, var(--ui-success) 25%, transparent) 50%,
    transparent 100%
  );
  animation: sweep 0.8s ease-out forwards;
}

@keyframes sweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); opacity: 0; }
}

/* Child count pulse animation */
.count-pulse {
  animation: count-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}

@keyframes count-pop {
  0% { transform: scale(1); box-shadow: 0 0 0 0 var(--ui-primary); }
  30% { transform: scale(1.4); }
  50% { transform: scale(0.9); box-shadow: 0 0 0 8px transparent; }
  70% { transform: scale(1.15); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 transparent; }
}
</style>
