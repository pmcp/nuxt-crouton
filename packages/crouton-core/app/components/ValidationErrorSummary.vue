<script setup lang="ts">
interface TabError {
  tab: string
  tabLabel: string
  count: number
}

interface Props {
  tabErrors: Record<string, number>
  navigationItems: Array<{ label: string, value: string }>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'switch-tab': [tabValue: string]
}>()

// Convert tabErrors map to array for display
const errorTabs = computed<TabError[]>(() => {
  return Object.entries(props.tabErrors)
    .filter(([_, count]) => count > 0)
    .map(([tabValue, count]) => {
      const navItem = props.navigationItems.find(item => item.value === tabValue)
      return {
        tab: tabValue,
        tabLabel: navItem?.label || tabValue,
        count
      }
    })
})

const totalErrors = computed(() => {
  return errorTabs.value.reduce((sum, tab) => sum + tab.count, 0)
})

const handleTabClick = (tabValue: string) => {
  emit('switch-tab', tabValue)
}
</script>

<template>
  <UAlert
    v-if="errorTabs.length > 0"
    color="error"
    icon="i-lucide-triangle-alert"
    :title="`Please fix ${totalErrors} validation ${totalErrors === 1 ? 'error' : 'errors'}`"
    class="mb-4"
  >
    <template #description>
      <div class="mt-2 space-y-1">
        <div
          v-for="errorTab in errorTabs"
          :key="errorTab.tab"
          class="flex items-center gap-2"
        >
          <UButton
            variant="link"
            color="error"
            size="xs"
            :padded="false"
            @click="handleTabClick(errorTab.tab)"
          >
            {{ errorTab.tabLabel }}
          </UButton>
          <span class="text-xs text-red-600 dark:text-red-400">
            ({{ errorTab.count }} {{ errorTab.count === 1 ? 'error' : 'errors' }})
          </span>
        </div>
      </div>
    </template>
  </UAlert>
</template>
