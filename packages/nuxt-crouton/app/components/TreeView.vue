<template>
  <div ref="treeContainer" class="crouton-tree-view">
    <UTree
      ref="tree"
      :items="treeItems"
      :nested="false"
      :get-key="(item: TreeNode) => item.id"
      :unmount-on-hide="false"
      color="neutral"
      @toggle="handleToggle"
      @select="handleSelect"
    >
      <template #item-leading="{ item, expanded }">
        <div class="flex items-center gap-2">
          <!-- Drag handle -->
          <div
            class="drag-handle cursor-grab opacity-50 hover:opacity-100 transition-opacity"
            @mousedown.stop
          >
            <UIcon name="i-lucide-grip-vertical" class="size-4" />
          </div>

          <!-- Expand/collapse icon for items with children -->
          <UIcon
            v-if="item.children?.length"
            :name="expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
            class="size-4 text-muted"
          />
          <div v-else class="w-4" />
        </div>
      </template>

      <template #item-label="{ item }">
        <div class="flex items-center gap-2 min-w-0">
          <!-- Item icon if provided -->
          <UIcon
            v-if="item.icon"
            :name="item.icon"
            class="size-4 shrink-0"
          />

          <!-- Item label (use labelKey or fallback to name/title/label) -->
          <span class="truncate">
            {{ getItemLabel(item) }}
          </span>

          <!-- Status badge if item has status -->
          <UBadge
            v-if="item.status"
            :color="getStatusColor(item.status)"
            size="xs"
            variant="subtle"
          >
            {{ item.status }}
          </UBadge>

          <!-- Children count badge -->
          <UBadge
            v-if="item.children?.length"
            color="neutral"
            size="xs"
            variant="subtle"
          >
            {{ item.children.length }}
          </UBadge>
        </div>
      </template>

      <template #item-trailing="{ item }">
        <div class="tree-item-trailing flex items-center gap-1 opacity-0 transition-opacity">
          <!-- Quick actions dropdown -->
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
      </template>
    </UTree>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import type { HierarchyConfig } from '../types/table'
import type { TreeNode } from './Tree.vue'

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

// Template refs
const tree = ref<HTMLElement | null>(null)
const treeContainer = ref<HTMLElement | null>(null)

// Convert tree items to format expected by UTree
const treeItems = computed(() => {
  return addTreeMetadata(props.items)
})

// Add metadata needed by UTree (defaultExpanded, etc.)
function addTreeMetadata(nodes: TreeNode[], depth = 0): TreeNode[] {
  return nodes.map(node => ({
    ...node,
    defaultExpanded: depth < 1, // Expand first level by default
    children: node.children?.length ? addTreeMetadata(node.children, depth + 1) : []
  }))
}

// Flatten tree for drag-drop operations
function flattenTree(items: TreeNode[], parent: TreeNode[] = items): { item: TreeNode; parent: TreeNode[]; index: number }[] {
  return items.flatMap((item, index) => [
    { item, parent, index },
    ...(item.children?.length && item.defaultExpanded ? flattenTree(item.children, item.children) : [])
  ])
}

// Get label from item based on labelKey prop
function getItemLabel(item: TreeNode): string {
  // Try labelKey first, then fallback to common keys
  return item[props.labelKey] || item.name || item.title || item.label || item.id
}

// Get status color based on status value
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
  return statusColors[status.toLowerCase()] || 'neutral'
}

// Get dropdown actions for an item
function getItemActions(item: TreeNode) {
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
          // This would trigger a create action with parentId set
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

// Handle toggle (expand/collapse)
function handleToggle(e: any, item: TreeNode) {
  // Allow toggle to work naturally
}

// Handle item selection
function handleSelect(e: any, item: TreeNode) {
  // Prevent default selection behavior on click
  // We want to edit on click, not select
  if (e.detail?.originalEvent?.type === 'click') {
    e.preventDefault()
    emit('select', item)
  }
}

// Initialize sortable for drag-and-drop
onMounted(async () => {
  // Dynamically import useSortable to avoid SSR issues
  if (import.meta.client) {
    try {
      const { useSortable } = await import('@vueuse/integrations/useSortable')

      // Target the UTree component ref, not the wrapper div
      // UTree renders as a list element that useSortable can work with
      if (tree.value) {
        useSortable(tree.value, treeItems, {
          animation: 150,
          handle: '.drag-handle',
          ghostClass: 'opacity-50',
          onUpdate: (evt: any) => {
            if (evt.oldIndex !== undefined && evt.newIndex !== undefined) {
              handleDragEnd(evt.oldIndex, evt.newIndex)
            }
          }
        })
      }
    } catch {
      // useSortable not available, drag-drop will be disabled
      console.warn('useSortable not available - install @vueuse/integrations and sortablejs for drag-drop support')
    }
  }
})

// Handle drag-and-drop end
function handleDragEnd(oldIndex: number, newIndex: number) {
  if (oldIndex === newIndex) return

  const flat = flattenTree(props.items)
  const source = flat[oldIndex]
  const target = flat[newIndex]

  if (!source || !target) return

  // Calculate new parent and order
  const newParentId = target.item.parentId
  const newOrder = newIndex

  emit('move', source.item.id, newParentId, newOrder)
}

// Watch for changes in items and reinitialize if needed
watch(() => props.items, () => {
  // Items have changed, tree will re-render automatically
}, { deep: true })
</script>

<style scoped>
.crouton-tree-view {
  width: 100%;
}

/* Drag handle styles */
.drag-handle {
  touch-action: none;
}

/* Show trailing actions on hover using CSS instead of Tailwind group */
.crouton-tree-view :deep([data-tree-item]:hover .tree-item-trailing) {
  opacity: 1;
}
</style>
