<script lang="ts" setup>
import { ref, computed, onMounted, nextTick, onBeforeUnmount, type Component } from 'vue'
import type SortableType from 'sortablejs'
import type { SortableEvent, MoveEvent } from 'sortablejs'

interface Props {
  /** Unique identifier for this column (the groupField value) */
  columnValue: string | null
  /** Display label for the column */
  label: string
  /** Items in this column */
  items: any[]
  /** Collection name */
  collection: string
  /** Optional color for column header */
  color?: string
  /** Optional icon for column header */
  icon?: string
  /** Card component to render for each item */
  cardComponent?: Component | null
  /** Show item count badge */
  showCount?: boolean
  /** Whether the column is currently the drop target */
  isDropTarget?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  color: undefined,
  icon: undefined,
  cardComponent: null,
  showCount: true,
  isDropTarget: false
})

const emit = defineEmits<{
  /** Emitted when an item is moved */
  move: [itemId: string, newColumnValue: string | null, newOrder: number]
  /** Emitted when an item card is clicked */
  select: [item: any]
  /** Emitted when drag starts */
  dragStart: [itemId: string]
  /** Emitted when drag ends */
  dragEnd: []
}>()

const columnRef = ref<HTMLElement | null>(null)
let sortableInstance: SortableType | null = null

async function initSortable() {
  if (!import.meta.client || !columnRef.value) return
  if (sortableInstance) return

  try {
    const { default: Sortable } = await import('sortablejs')

    sortableInstance = new Sortable(columnRef.value, {
      group: 'kanban',
      animation: 150,
      fallbackOnBody: true,
      swapThreshold: 0.65,
      handle: '.kanban-card',
      ghostClass: 'kanban-ghost',
      chosenClass: 'kanban-chosen',
      dragClass: 'kanban-drag',
      forceFallback: true,
      removeCloneOnHide: true,

      onStart: (evt: SortableEvent) => {
        const id = (evt.item as HTMLElement).dataset.id
        if (id) emit('dragStart', id)
      },

      onEnd: (evt: SortableEvent) => {
        emit('dragEnd')

        // Only handle if this container is the source
        if (evt.from !== columnRef.value) return

        const itemId = (evt.item as HTMLElement).dataset.id
        if (!itemId) return

        const toContainer = evt.to as HTMLElement
        const toColumnValue = toContainer.dataset.columnValue ?? null
        const newIndex = evt.newIndex ?? 0

        emit('move', itemId, toColumnValue, newIndex)
      },

      onMove: (_evt: MoveEvent) => {
        // Allow all moves within kanban
        return true
      }
    })
  } catch (error) {
    console.warn('[KanbanColumn] Sortable not available:', error)
  }
}

onBeforeUnmount(() => {
  sortableInstance?.destroy()
  sortableInstance = null
})

onMounted(async () => {
  await nextTick()
  initSortable()
})

// Badge color mapping
const badgeColor = computed(() => {
  if (!props.color) return 'neutral'
  const colorMap: Record<string, string> = {
    red: 'error',
    green: 'success',
    blue: 'info',
    amber: 'warning',
    yellow: 'warning',
    orange: 'warning',
    purple: 'primary',
    pink: 'primary',
    gray: 'neutral',
    grey: 'neutral'
  }
  return colorMap[props.color] || props.color
})
</script>

<template>
  <div
    class="kanban-column flex flex-col bg-muted/30 rounded-lg min-w-72 max-w-80 w-72 shrink-0"
    :class="{ 'ring-2 ring-primary/50': isDropTarget }"
  >
    <!-- Column Header -->
    <div class="flex items-center gap-2 px-3 py-2 border-b border-default">
      <UIcon
        v-if="icon"
        :name="icon"
        class="w-4 h-4 text-muted"
      />
      <span class="font-medium text-sm truncate flex-1">{{ label }}</span>
      <UBadge
        v-if="showCount"
        :color="badgeColor"
        variant="subtle"
        size="xs"
      >
        {{ items.length }}
      </UBadge>
    </div>

    <!-- Cards Container -->
    <div
      ref="columnRef"
      class="flex-1 p-2 space-y-2 overflow-y-auto min-h-32"
      :data-column-value="columnValue ?? ''"
    >
      <div
        v-for="item in items"
        :key="item.id"
        :data-id="item.id"
        class="kanban-card cursor-grab active:cursor-grabbing"
        @click="emit('select', item)"
      >
        <!-- Use custom card component if provided -->
        <component
          :is="cardComponent"
          v-if="cardComponent"
          :item="item"
          :layout="'kanban'"
          :collection="collection"
        />

        <!-- Default card rendering -->
        <UCard
          v-else
          class="hover:shadow-md transition-shadow"
        >
          <div class="text-sm">
            {{ item.name || item.title || item.label || item.id }}
          </div>
          <div
            v-if="item.description"
            class="text-xs text-muted mt-1 line-clamp-2"
          >
            {{ item.description }}
          </div>
        </UCard>
      </div>

      <!-- Empty state -->
      <div
        v-if="items.length === 0"
        class="flex items-center justify-center h-20 text-muted text-sm border-2 border-dashed border-muted/30 rounded-lg"
      >
        Drop items here
      </div>
    </div>
  </div>
</template>

<style>
/* SortableJS dynamic classes - must be global (not scoped) */

/* Ghost = placeholder showing where item will drop */
.kanban-ghost {
  opacity: 0.5;
  border-radius: 0.375rem;
  background-color: color-mix(in oklch, var(--ui-primary) 10%, transparent);
}

/* Drag = the element being dragged (follows cursor) */
.kanban-drag {
  background-color: var(--ui-bg);
  box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.25);
  opacity: 0.9;
  border-radius: 0.375rem;
}

/* Chosen = the original element that was picked up */
.kanban-chosen {
  opacity: 0.4;
}
</style>
