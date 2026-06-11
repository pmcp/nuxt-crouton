<template>
  <div ref="wrapEl">
    <UTabs
      :key="tabsKey"
      :model-value="modelValue ?? fallbackValue"
      :items="tabItems"
      :content="false"
      @update:model-value="onTabChange"
    >
      <!-- Editable mode: pencil inside the active tab → edit that category -->
      <template v-if="editable" #trailing="{ item }">
        <!-- Styled span, not <UButton>: this sits inside the tab's <button>,
             and nested buttons are invalid HTML (breaks SSR hydration). -->
        <span
          v-if="item.value !== 'all' && (modelValue ?? fallbackValue) === item.value"
          role="button"
          :aria-label="t('common.edit')"
          class="ml-1.5 inline-flex items-center justify-center size-6 rounded-full
                 bg-black/15 hover:bg-black/30 active:scale-95 transition-all"
          @click.stop="emit('edit', String(item.value))"
        >
          <UIcon name="i-lucide-pencil" class="size-3.5" />
        </span>
      </template>
    </UTabs>
  </div>
</template>

<script setup lang="ts">
import Sortable from 'sortablejs'
import type { TabsItem } from '@nuxt/ui'
const { t } = useT()
import type { SalesCategory } from '../../types'

const props = withDefaults(defineProps<{
  categories: SalesCategory[]
  modelValue: string | null
  // Count to badge on each tab, keyed by category id. Meaning is up to the
  // caller (cart quantity in the POS, product count in the admin workspace).
  // Hidden when zero.
  counts?: Record<string, number>
  // Show the leading "All" tab (default). Set false to force a category selection.
  showAll?: boolean
  // Admin POS: pencil on the active tab (emits 'edit') + drag-reorder of the
  // tabs themselves (emits 'reorder'; only when showAll is off, so indices
  // map 1:1 onto categories).
  editable?: boolean
}>(), { showAll: true, counts: () => ({}) })

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  'edit': [categoryId: string]
  'reorder': [updates: Array<{ id: string, order: number }>]
}>()

// Local mutable copy so a drop can reorder optimistically before the parent's
// data refresh catches up.
const orderedCategories = ref<SalesCategory[]>([])
watch(() => props.categories, (v) => { orderedCategories.value = [...(v || [])] }, { immediate: true })

const totalCount = computed(() =>
  Object.values(props.counts).reduce((sum, count) => sum + count, 0),
)

// Append a "(n)" badge only when there are items in the cart for that tab.
function withCount(label: string, count: number): string {
  return count > 0 ? `${label} (${count})` : label
}

const tabItems = computed<TabsItem[]>(() => {
  const items: TabsItem[] = []

  if (props.showAll) {
    items.push({
      label: withCount(t('sales.categories.all'), totalCount.value),
      value: 'all',
    })
  }

  for (const cat of orderedCategories.value) {
    items.push({
      label: withCount(cat.title, props.counts[cat.id] || 0),
      value: cat.id,
    })
  }

  return items
})

// When "All" is hidden, fall back to the first category instead of 'all'.
const fallbackValue = computed(() =>
  props.showAll ? 'all' : (orderedCategories.value[0]?.id ?? 'all'),
)

function onTabChange(value: string | number) {
  emit('update:modelValue', value === 'all' ? null : String(value))
}

// --- Tab drag-reorder (editable POS) ---------------------------------------
// SortableJS moves DOM nodes that Vue owns, so after a drop we apply the move
// to our local array and bump `tabsKey` to remount UTabs with clean DOM (the
// Sortable instance dies with the old tablist; re-init on the new one).
const wrapEl = ref<HTMLElement | null>(null)
const tabsKey = ref(0)
let sortable: Sortable | null = null

function initTabSortable() {
  if (!import.meta.client || !props.editable || props.showAll) return
  const listEl = wrapEl.value?.querySelector('[role="tablist"]') as HTMLElement | null
  if (!listEl) return
  sortable?.destroy()
  sortable = Sortable.create(listEl, {
    animation: 150,
    draggable: '[role="tab"]',
    onEnd: (evt) => {
      const from = evt.oldIndex ?? 0
      const to = evt.newIndex ?? 0
      if (from === to) return
      const list = [...orderedCategories.value]
      const [moved] = list.splice(from, 1)
      if (!moved) return
      list.splice(to, 0, moved)
      orderedCategories.value = list
      tabsKey.value++
      nextTick(initTabSortable)
      emit('reorder', list.map((c, index) => ({ id: c.id, order: index })))
    }
  })
}

onMounted(initTabSortable)
onUnmounted(() => sortable?.destroy())
</script>
