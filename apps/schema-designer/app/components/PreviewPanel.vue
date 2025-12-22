<script setup lang="ts">
const { state } = useSchemaDesigner()
const { generateMockRows, generateColumns } = useMockData()

type LayoutType = 'table' | 'list' | 'grid' | 'cards'
const currentLayout = ref<LayoutType>('table')

const layouts: { value: LayoutType; label: string; icon: string }[] = [
  { value: 'table', label: 'Table', icon: 'i-lucide-table' },
  { value: 'list', label: 'List', icon: 'i-lucide-list' },
  { value: 'grid', label: 'Grid', icon: 'i-lucide-layout-grid' },
  { value: 'cards', label: 'Cards', icon: 'i-lucide-square' }
]

// Generate mock data reactively
const mockRows = computed(() => {
  if (state.value.fields.length === 0) return []
  return generateMockRows(state.value.fields, 5)
})

const columns = computed(() => {
  return generateColumns(state.value.fields)
})

const hasValidFields = computed(() => {
  return state.value.fields.some(f => f.name)
})

// Refresh mock data
const refreshKey = ref(0)
function refreshData() {
  refreshKey.value++
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="p-4 border-b border-[var(--ui-border)] flex items-center justify-between">
      <h2 class="font-semibold">Preview</h2>
      <div class="flex items-center gap-2">
        <UButtonGroup size="xs">
          <UButton
            v-for="layout in layouts"
            :key="layout.value"
            :variant="currentLayout === layout.value ? 'solid' : 'ghost'"
            :icon="layout.icon"
            @click="currentLayout = layout.value"
          />
        </UButtonGroup>
        <UButton
          variant="ghost"
          color="neutral"
          size="xs"
          icon="i-lucide-refresh-cw"
          @click="refreshData"
        />
      </div>
    </div>

    <!-- Preview Content -->
    <div class="flex-1 overflow-auto" :key="refreshKey">
      <template v-if="hasValidFields">
        <!-- Use CroutonCollection in stateless mode -->
        <CroutonCollection
          :columns="columns"
          :rows="mockRows"
          :layout="currentLayout"
          :collection="state.collectionName || 'preview'"
          stateless
        />
      </template>

      <!-- Empty State -->
      <div
        v-else
        class="h-full flex items-center justify-center text-center text-[var(--ui-text-muted)]"
      >
        <div>
          <UIcon name="i-lucide-eye-off" class="text-3xl mb-2" />
          <p class="text-sm">Add fields to see a preview</p>
        </div>
      </div>
    </div>

    <!-- Footer Info -->
    <div class="p-3 border-t border-[var(--ui-border)] text-xs text-[var(--ui-text-muted)]">
      <div class="flex items-center justify-between">
        <span>Showing {{ mockRows.length }} mock records</span>
        <span v-if="state.collectionName">
          {{ state.layerName }}/{{ state.collectionName }}
        </span>
      </div>
    </div>
  </div>
</template>
