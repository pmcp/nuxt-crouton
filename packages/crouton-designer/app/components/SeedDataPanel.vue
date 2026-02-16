<script setup lang="ts">
import type { SeedDataMap } from '../types/schema'
import type { CollectionWithFields } from '../composables/useCollectionEditor'

const props = defineProps<{
  collections: CollectionWithFields[]
  seedData: SeedDataMap
}>()

const emit = defineEmits<{
  'regenerate': [collectionName: string]
}>()

const { t } = useT()

// Active tab tracks which collection is displayed
const activeTab = ref(0)

// Build tab items from collections
const tabItems = computed(() =>
  props.collections.map(col => ({
    label: col.name,
    badge: props.seedData[col.name]?.length ?? 0
  }))
)

// Get columns for the active collection
const activeCollection = computed(() => props.collections[activeTab.value])

const columns = computed(() => {
  const col = activeCollection.value
  if (!col) return []
  // _id column first, then collection fields
  return [
    { key: '_id', label: '_id' },
    ...col.fields.map(f => ({
      key: f.name,
      label: f.meta?.label || f.name
    }))
  ]
})

// Get rows for the active collection
const rows = computed(() => {
  const col = activeCollection.value
  if (!col) return []
  return props.seedData[col.name] || []
})

// Truncate long cell values for display
function formatCell(value: any): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  const str = String(value)
  return str.length > 60 ? str.slice(0, 57) + '...' : str
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Empty state -->
    <div
      v-if="collections.length === 0"
      class="flex-1 flex items-center justify-center"
    >
      <p class="text-sm text-[var(--ui-text-muted)] italic">
        {{ t('designer.seedData.noCollections') }}
      </p>
    </div>

    <template v-else>
      <!-- Tabs for each collection -->
      <UTabs
        v-model="activeTab"
        :items="tabItems"
        class="w-full"
      />

      <!-- Content area -->
      <div class="flex-1 overflow-auto p-4">
        <!-- Loading / empty state per collection -->
        <div
          v-if="rows.length === 0"
          class="flex flex-col items-center justify-center gap-3 py-12"
        >
          <UIcon name="i-lucide-database" class="size-8 text-[var(--ui-text-muted)]" />
          <p class="text-sm text-[var(--ui-text-muted)]">
            {{ t('designer.seedData.noData') }}
          </p>
        </div>

        <!-- Data table -->
        <div v-else class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs text-[var(--ui-text-muted)]">
              {{ t('designer.seedData.entryCount', { count: rows.length }) }}
            </span>
            <UButton
              :label="t('designer.seedData.regenerate')"
              icon="i-lucide-refresh-cw"
              variant="ghost"
              size="xs"
              @click="emit('regenerate', activeCollection!.name)"
            />
          </div>

          <div class="overflow-x-auto rounded-md border border-[var(--ui-border)]">
            <table class="w-full text-xs">
              <thead>
                <tr class="bg-[var(--ui-bg-elevated)]">
                  <th
                    v-for="col in columns"
                    :key="col.key"
                    class="px-3 py-2 text-left font-medium text-[var(--ui-text-muted)] whitespace-nowrap"
                    :class="{ 'text-[var(--ui-text-dimmed)]': col.key === '_id' }"
                  >
                    {{ col.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, idx) in rows"
                  :key="row._id || idx"
                  class="border-t border-[var(--ui-border)]"
                >
                  <td
                    v-for="col in columns"
                    :key="col.key"
                    class="px-3 py-2 whitespace-nowrap"
                    :class="{ 'text-[var(--ui-text-dimmed)] font-mono': col.key === '_id' }"
                  >
                    {{ formatCell(row[col.key]) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
