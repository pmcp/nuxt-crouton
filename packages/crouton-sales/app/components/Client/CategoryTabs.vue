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
  productCounts: Record<string, number>
  // Show the leading "All" tab (default). Set false to force a category selection.
  showAll?: boolean
}>(), { showAll: true })

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const totalCount = computed(() =>
  Object.values(props.productCounts).reduce((sum, count) => sum + count, 0),
)

const tabItems = computed<TabsItem[]>(() => {
  const items: TabsItem[] = []

  if (props.showAll) {
    items.push({
      label: `${t('sales.categories.all')} (${totalCount.value})`,
      value: 'all',
    })
  }

  for (const cat of props.categories) {
    items.push({
      label: `${cat.title} (${props.productCounts[cat.id] || 0})`,
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
