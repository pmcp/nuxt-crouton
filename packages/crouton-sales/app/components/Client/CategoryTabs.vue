<template>
  <UTabs
    :model-value="modelValue ?? 'all'"
    :items="tabItems"
    :content="false"
    @update:model-value="onTabChange"
  />
</template>

<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import type { SalesCategory } from '../../types'

const props = defineProps<{
  categories: SalesCategory[]
  modelValue: string | null
  productCounts: Record<string, number>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const totalCount = computed(() =>
  Object.values(props.productCounts).reduce((sum, count) => sum + count, 0),
)

const tabItems = computed<TabsItem[]>(() => {
  const items: TabsItem[] = [
    {
      label: `All (${totalCount.value})`,
      value: 'all',
    },
  ]

  for (const cat of props.categories) {
    items.push({
      label: `${cat.title} (${props.productCounts[cat.id] || 0})`,
      value: cat.id,
    })
  }

  return items
})

function onTabChange(value: string | number) {
  emit('update:modelValue', value === 'all' ? null : String(value))
}
</script>
