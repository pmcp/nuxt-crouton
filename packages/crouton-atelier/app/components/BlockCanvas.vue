<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onBeforeUnmount } from 'vue'
import type SortableType from 'sortablejs'
import type { SortableEvent } from 'sortablejs'
import type { SelectedBlock, Visibility } from '../types/blocks'
import { blocks as allBlocks } from '../data/blocks'

interface Props {
  blocksByVisibility: Record<Visibility, SelectedBlock[]>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [blockId: string]
  remove: [blockId: string]
  move: [blockId: string, newVisibility: Visibility, newOrder: number]
  reorder: [visibility: Visibility, blockIds: string[]]
}>()

const columns: Array<{ value: Visibility, label: string, icon: string, color: string }> = [
  { value: 'public', label: 'Public', icon: 'i-lucide-globe', color: 'primary' },
  { value: 'auth', label: 'Members', icon: 'i-lucide-lock', color: 'warning' },
  { value: 'admin', label: 'Admin', icon: 'i-lucide-shield', color: 'error' }
]

function getBlock(blockId: string) {
  return allBlocks.find(b => b.id === blockId)
}

// ── Mobile swipe tab ────────────────────────────────────────────
const activeTab = ref<Visibility>('public')

// ── Sortable (desktop kanban) ───────────────────────────────────
const columnRefs = ref<Record<string, HTMLElement | null>>({})
const sortableInstances: SortableType[] = []

function setColumnRef(el: any, value: Visibility) {
  columnRefs.value[value] = el as HTMLElement
}

async function initSortable() {
  if (!import.meta.client) return

  try {
    const { default: Sortable } = await import('sortablejs')

    for (const col of columns) {
      const el = columnRefs.value[col.value]
      if (!el) continue

      const instance = new Sortable(el, {
        group: 'atelier-kanban',
        animation: 150,
        fallbackOnBody: true,
        swapThreshold: 0.65,
        handle: '.atelier-block-card',
        ghostClass: 'atelier-ghost',
        chosenClass: 'atelier-chosen',
        dragClass: 'atelier-drag',
        forceFallback: true,
        removeCloneOnHide: true,

        onEnd: (evt: SortableEvent) => {
          if (evt.from !== el && evt.to !== el) return

          const blockId = (evt.item as HTMLElement).dataset.blockId
          if (!blockId) return

          const toContainer = evt.to as HTMLElement
          const newVisibility = (toContainer.dataset.visibility as Visibility) ?? 'public'
          const newIndex = evt.newIndex ?? 0

          if (evt.from === evt.to) {
            // Reorder within same column
            const items = [...toContainer.querySelectorAll('[data-block-id]')]
            const ids = items.map(el => (el as HTMLElement).dataset.blockId!).filter(Boolean)
            emit('reorder', newVisibility, ids)
          } else {
            // Move between columns
            emit('move', blockId, newVisibility, newIndex)
          }
        }
      })

      sortableInstances.push(instance)
    }
  } catch (error) {
    console.warn('[BlockCanvas] Sortable not available:', error)
  }
}

onMounted(async () => {
  await nextTick()
  initSortable()
})

onBeforeUnmount(() => {
  for (const instance of sortableInstances) {
    instance.destroy()
  }
  sortableInstances.length = 0
})
</script>

<template>
  <div class="block-canvas">
    <!-- Desktop: Side-by-side kanban columns -->
    <div class="hidden md:flex gap-4 h-full">
      <div
        v-for="col in columns"
        :key="col.value"
        class="flex-1 flex flex-col bg-muted/30 rounded-lg min-w-0"
      >
        <!-- Column header -->
        <div class="flex items-center gap-2 px-3 py-2 border-b border-default">
          <UIcon :name="col.icon" class="w-4 h-4 text-muted" />
          <span class="font-medium text-sm flex-1">{{ col.label }}</span>
          <UBadge :color="col.color" variant="subtle" size="xs">
            {{ blocksByVisibility[col.value]?.length ?? 0 }}
          </UBadge>
        </div>

        <!-- Cards container (sortable) -->
        <div
          :ref="(el) => setColumnRef(el, col.value)"
          :data-visibility="col.value"
          class="flex-1 p-2 space-y-2 overflow-y-auto min-h-24"
        >
          <div
            v-for="sb in blocksByVisibility[col.value]"
            :key="sb.blockId"
            :data-block-id="sb.blockId"
            class="atelier-block-card"
          >
            <AtelierBlockCard
              v-if="getBlock(sb.blockId)"
              :block="getBlock(sb.blockId)!"
              @select="emit('select', $event.id)"
              @remove="emit('remove', $event)"
            />
          </div>

          <!-- Empty state -->
          <div
            v-if="!blocksByVisibility[col.value]?.length"
            class="flex items-center justify-center h-20 text-muted text-xs border-2 border-dashed border-muted/30 rounded-lg"
          >
            Drop {{ col.label.toLowerCase() }} blocks here
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile: Tabbed layout -->
    <div class="md:hidden">
      <div class="flex border-b border-default mb-3">
        <button
          v-for="col in columns"
          :key="col.value"
          class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm transition-colors"
          :class="activeTab === col.value ? 'text-primary border-b-2 border-primary font-medium' : 'text-muted'"
          @click="activeTab = col.value"
        >
          <UIcon :name="col.icon" class="w-3.5 h-3.5" />
          {{ col.label }}
          <UBadge
            v-if="blocksByVisibility[col.value]?.length"
            :color="col.color"
            variant="subtle"
            size="xs"
          >
            {{ blocksByVisibility[col.value].length }}
          </UBadge>
        </button>
      </div>

      <div class="space-y-2 px-1">
        <div
          v-for="sb in blocksByVisibility[activeTab]"
          :key="sb.blockId"
        >
          <AtelierBlockCard
            v-if="getBlock(sb.blockId)"
            :block="getBlock(sb.blockId)!"
            @select="emit('select', $event.id)"
            @remove="emit('remove', $event)"
          />
        </div>

        <div
          v-if="!blocksByVisibility[activeTab]?.length"
          class="flex items-center justify-center h-24 text-muted text-sm border-2 border-dashed border-muted/30 rounded-lg"
        >
          No {{ activeTab }} blocks yet — tap + to add
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* SortableJS dynamic classes - must be global */
.atelier-ghost {
  opacity: 0.4;
  border-radius: 0.5rem;
  background-color: color-mix(in oklch, var(--ui-primary) 10%, transparent);
}

.atelier-drag {
  background-color: var(--ui-bg);
  box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.25);
  opacity: 0.9;
  border-radius: 0.5rem;
}

.atelier-chosen {
  opacity: 0.3;
}
</style>
