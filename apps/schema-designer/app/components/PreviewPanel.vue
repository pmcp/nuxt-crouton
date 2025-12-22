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
    <div class="flex-1 overflow-auto p-4" :key="refreshKey">
      <template v-if="hasValidFields">
        <!-- Table Layout -->
        <div v-if="currentLayout === 'table'" class="overflow-x-auto">
          <UTable
            :columns="columns"
            :data="mockRows"
            :ui="{
              th: 'text-xs',
              td: 'text-sm'
            }"
          />
        </div>

        <!-- List Layout -->
        <div v-else-if="currentLayout === 'list'" class="space-y-2">
          <div
            v-for="(row, i) in mockRows"
            :key="i"
            class="p-3 bg-[var(--ui-bg)] border border-[var(--ui-border)] rounded-lg"
          >
            <div class="font-medium">
              {{ state.fields[0]?.name ? row[state.fields[0].name] : 'Item ' + (i + 1) }}
            </div>
            <div v-if="state.fields[1]?.name" class="text-sm text-[var(--ui-text-muted)] truncate">
              {{ row[state.fields[1].name] }}
            </div>
          </div>
        </div>

        <!-- Grid Layout -->
        <div v-else-if="currentLayout === 'grid'" class="grid grid-cols-2 gap-3">
          <div
            v-for="(row, i) in mockRows"
            :key="i"
            class="p-3 bg-[var(--ui-bg)] border border-[var(--ui-border)] rounded-lg"
          >
            <div class="font-medium text-sm truncate">
              {{ state.fields[0]?.name ? row[state.fields[0].name] : 'Item ' + (i + 1) }}
            </div>
            <div v-if="state.fields[1]?.name" class="text-xs text-[var(--ui-text-muted)] truncate mt-1">
              {{ row[state.fields[1].name] }}
            </div>
          </div>
        </div>

        <!-- Cards Layout -->
        <div v-else-if="currentLayout === 'cards'" class="space-y-4">
          <div
            v-for="(row, i) in mockRows"
            :key="i"
            class="p-4 bg-[var(--ui-bg)] border border-[var(--ui-border)] rounded-lg"
          >
            <div class="font-semibold mb-2">
              {{ state.fields[0]?.name ? row[state.fields[0].name] : 'Item ' + (i + 1) }}
            </div>
            <div class="space-y-1">
              <div
                v-for="field in state.fields.slice(1, 4).filter(f => f.name)"
                :key="field.id"
                class="flex items-center gap-2 text-sm"
              >
                <span class="text-[var(--ui-text-muted)]">{{ field.meta.label || field.name }}:</span>
                <span class="truncate">{{ row[field.name] }}</span>
              </div>
            </div>
          </div>
        </div>
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
