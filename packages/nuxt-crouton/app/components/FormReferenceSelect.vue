<template>
  <div class="w-full">
    <!-- Error state -->
    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-alert-triangle"
      title="Unable to load options"
      :description="getErrorMessage()"
      class="mb-2"
    />

    <!-- Select menu (single or multiple) -->
    <USelectMenu
      v-model="selected"
      :items="items"
      value-key="id"
      :label-key="labelKey"
      :placeholder="`Select ${label || collection}`"
      :loading="pending"
      :filter-fields="filterFields"
      :disabled="!!error"
      :multiple="multiple"
      size="xl"
      searchable
      class="w-full"
    >
      <!-- Explicitly show the selected value label since value-key returns ID, not object -->
      <template #default="{ modelValue }">
        <span v-if="modelValue && !multiple" class="truncate">
          {{ getItemLabel(modelValue as string) }}
        </span>
        <span v-else-if="modelValue && multiple && (modelValue as string[]).length > 0" class="truncate">
          {{ (modelValue as string[]).map(id => getItemLabel(id)).join(', ') }}
        </span>
        <span v-else class="text-dimmed truncate">
          Select {{ label || collection }}
        </span>
      </template>

      <template #item-label="{ item }">
        <span>{{ (item as Record<string, any>)?.[labelKey] || (item as Record<string, any>)?.id }}</span>
      </template>

      <template #content-top>
        <div class="p-1">
          <UButton
            v-if="!hideCreate"
            color="neutral"
            icon="i-lucide-plus"
            variant="soft"
            block
            @click="handleCreate"
          >
            Create new {{ label || collection }}
          </UButton>
        </div>
      </template>
    </USelectMenu>
  </div>
</template>

<script setup lang="ts">
import type { ComputedRef, Ref } from 'vue'

interface Props {
  modelValue: string | string[] | null
  collection: string
  label?: string
  labelKey?: string
  filterFields?: string[]
  hideCreate?: boolean
  multiple?: boolean
  query?: ComputedRef<Record<string, any>> | Ref<Record<string, any>>
}

const props = withDefaults(defineProps<Props>(), {
  labelKey: 'title',
  filterFields: () => ['title'],
  multiple: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | string[] | null]
}>()

const { open, close } = useCrouton()

// Fetch items from the referenced collection (with optional query filter)
const { items, pending, refresh, error } = await useCollectionQuery(props.collection, {
  query: props.query
})

// Helper to get user-friendly error message
const getErrorMessage = () => {
  if (!error.value) return ''

  const status = error.value.statusCode || error.value.status

  if (status === 404) {
    return 'The data endpoint could not be found. Please check your team settings or contact support.'
  }

  if (status === 403) {
    return 'You do not have permission to view this data.'
  }

  if (status >= 500) {
    return 'A server error occurred. Please try again later.'
  }

  return error.value.statusMessage || 'An error occurred while loading data.'
}

// Helper to get item label by ID
const getItemLabel = (id: string): string => {
  const item = items.value.find(item => item.id === id)
  if (!item) return id // Fallback to ID if item not found
  return (item as Record<string, any>)[props.labelKey] || item.id
}

// Instance-specific state to prevent cross-contamination between multiple forms
const localValue = ref<string | string[] | null>(
  props.multiple
    ? (Array.isArray(props.modelValue) ? props.modelValue : [])
    : props.modelValue
)

// Watch props.modelValue for external changes
watch(() => props.modelValue, (newValue) => {
  if (props.multiple) {
    localValue.value = Array.isArray(newValue) ? newValue : []
  } else {
    localValue.value = newValue
  }
})

// Computed v-model for two-way binding
// With value-key="id", USelectMenu expects the ID as modelValue
// It internally finds and displays the matching item
const selected = computed({
  get: () => {
    return localValue.value
  },
  set: (value: string | string[] | null) => {
    localValue.value = value
    emit('update:modelValue', value)
  }
})

// Track the initial items count to detect new items
const initialItemsCount = ref(items.value.length)
const isCreating = ref(false)

// Handle create button click
const handleCreate = () => {
  isCreating.value = true
  open('create', props.collection, [])
}

// Watch for new items after creation
watch(() => items.value.length, async (newCount, oldCount) => {
  if (isCreating.value && newCount > oldCount) {
    // A new item was added - find it and select it
    const newItem = items.value[items.value.length - 1]
    if (newItem) {
      if (props.multiple) {
        const currentIds = localValue.value as string[]
        const updatedIds = [...currentIds, newItem.id]
        localValue.value = updatedIds
        emit('update:modelValue', updatedIds)
      } else {
        localValue.value = newItem.id
        emit('update:modelValue', newItem.id)
      }
      isCreating.value = false
    }
  }
})

// Refresh items when component mounts to ensure we have latest data
onMounted(() => {
  refresh()
})
</script>
