<script setup lang="ts">
interface FilterState {
  collectionName?: string
  operation?: 'create' | 'update' | 'delete' | ''
  userId?: string
  dateFrom?: Date
  dateTo?: Date
}

const props = withDefaults(defineProps<{
  modelValue: FilterState
  collections?: string[]
  users?: Array<{ id: string, name: string }>
}>(), {
  collections: () => [],
  users: () => []
})

const emit = defineEmits<{
  'update:modelValue': [value: FilterState]
  refresh: []
}>()

// Local state synced with v-model
const filters = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Operation options
const operationOptions = [
  { label: 'All Operations', value: '' },
  { label: 'Create', value: 'create' },
  { label: 'Update', value: 'update' },
  { label: 'Delete', value: 'delete' }
]

// Collection options
const collectionOptions = computed(() => [
  { label: 'All Collections', value: '' },
  ...props.collections.map(c => ({ label: c, value: c }))
])

// User options
const userOptions = computed(() => [
  { label: 'All Users', value: '' },
  ...props.users.map(u => ({ label: u.name, value: u.id }))
])

// Date range presets
const datePresets = [
  { label: 'All Time', value: null },
  { label: 'Today', value: 0 },
  { label: 'Last 7 Days', value: 7 },
  { label: 'Last 30 Days', value: 30 },
  { label: 'Last 90 Days', value: 90 }
]

const selectedDatePreset = ref<number | null>(null)

function applyDatePreset(days: number | null) {
  selectedDatePreset.value = days
  if (days === null) {
    filters.value = { ...filters.value, dateFrom: undefined, dateTo: undefined }
  } else {
    const now = new Date()
    const from = new Date()
    from.setDate(now.getDate() - days)
    from.setHours(0, 0, 0, 0)
    filters.value = { ...filters.value, dateFrom: from, dateTo: now }
  }
}

// Clear all filters
function clearFilters() {
  emit('update:modelValue', {
    collectionName: undefined,
    operation: undefined,
    userId: undefined,
    dateFrom: undefined,
    dateTo: undefined
  })
  selectedDatePreset.value = null
}

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return !!(
    props.modelValue.collectionName ||
    props.modelValue.operation ||
    props.modelValue.userId ||
    props.modelValue.dateFrom ||
    props.modelValue.dateTo
  )
})
</script>

<template>
  <div class="crouton-activity-filters space-y-4">
    <!-- Main filters row -->
    <div class="flex flex-wrap items-center gap-3">
      <!-- Collection filter -->
      <USelectMenu
        v-model="filters.collectionName"
        :items="collectionOptions"
        value-key="value"
        placeholder="Collection"
        class="w-40"
      >
        <template #leading>
          <UIcon
            name="i-lucide-database"
            class="size-4 text-muted"
          />
        </template>
      </USelectMenu>

      <!-- Operation filter -->
      <USelectMenu
        v-model="filters.operation"
        :items="operationOptions"
        value-key="value"
        placeholder="Operation"
        class="w-36"
      >
        <template #leading>
          <UIcon
            name="i-lucide-zap"
            class="size-4 text-muted"
          />
        </template>
      </USelectMenu>

      <!-- User filter (if users provided) -->
      <USelectMenu
        v-if="users.length"
        v-model="filters.userId"
        :items="userOptions"
        value-key="value"
        placeholder="User"
        class="w-40"
      >
        <template #leading>
          <UIcon
            name="i-lucide-user"
            class="size-4 text-muted"
          />
        </template>
      </USelectMenu>

      <!-- Date preset buttons -->
      <div class="flex items-center gap-1 border rounded-lg p-1">
        <UButton
          v-for="preset in datePresets"
          :key="preset.value ?? 'all'"
          :color="selectedDatePreset === preset.value ? 'primary' : 'neutral'"
          :variant="selectedDatePreset === preset.value ? 'solid' : 'ghost'"
          size="xs"
          @click="applyDatePreset(preset.value)"
        >
          {{ preset.label }}
        </UButton>
      </div>

      <!-- Spacer -->
      <div class="flex-1" />

      <!-- Clear filters -->
      <UButton
        v-if="hasActiveFilters"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="clearFilters"
      >
        <UIcon
          name="i-lucide-x"
          class="size-4 mr-1"
        />
        Clear
      </UButton>

      <!-- Refresh -->
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        @click="emit('refresh')"
      >
        <UIcon
          name="i-lucide-refresh-cw"
          class="size-4 mr-1"
        />
        Refresh
      </UButton>
    </div>
  </div>
</template>
