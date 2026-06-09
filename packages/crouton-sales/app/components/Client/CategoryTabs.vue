<template>
  <UTabs
    :model-value="modelValue ?? fallbackValue"
    :items="tabItems"
    :content="false"
    @update:model-value="onTabChange"
  />
</template>

<script setup lang="ts">
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
}>(), { showAll: true, counts: () => ({}) })

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

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

  for (const cat of props.categories) {
    items.push({
      label: withCount(cat.title, props.counts[cat.id] || 0),
      value: cat.id,
    })
  }

  return items
})

// When "All" is hidden, fall back to the first category instead of 'all'.
const fallbackValue = computed(() =>
  props.showAll ? 'all' : (props.categories[0]?.id ?? 'all'),
)

function onTabChange(value: string | number) {
  emit('update:modelValue', value === 'all' ? null : String(value))
}
</script>
