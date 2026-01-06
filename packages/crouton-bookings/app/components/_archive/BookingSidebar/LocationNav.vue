<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import type { LocationData } from '../../types/booking'

interface Props {
  locations: LocationData[]
  modelValue: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const tabItems = computed<TabsItem[]>(() => {
  return props.locations.map(loc => ({
    label: loc.title,
    value: loc.id,
  }))
})

const activeLocation = computed({
  get: () => props.modelValue || props.locations[0]?.id || '',
  set: (value: string) => emit('update:modelValue', value),
})
</script>

<template>
  <UTabs
    v-model="activeLocation"
    :items="tabItems"
    :content="false"
    variant="pill"
    color="neutral"
    :ui="{
      list: 'gap-0.5 p-0',
      trigger: 'px-4 py-1.5 text-sm font-medium whitespace-nowrap rounded-full data-[state=active]:bg-neutral-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-neutral-900 transition-colors',
    }"
  />
</template>
