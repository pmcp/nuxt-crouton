<template>
  <div class="w-full">
    <!-- Error state -->
    <UAlert
      v-if="error"
      color="amber"
      icon="i-lucide-alert-triangle"
      title="Unable to load options"
      :description="getErrorMessage()"
      class="mb-2"
    />

    <!-- Multiple select menu -->
    <USelectMenu
      v-model="selected"
      :items="items"
      value-key="id"
      :label-key="labelKey"
      :placeholder="`Select ${label || collection}`"
      :loading="pending"
      :filter-fields="filterFields"
      :disabled="!!error"
      size="xl"
      searchable
      multiple
      class="w-full"
    >
      <template #option="{ option }">
        <span>{{ option[labelKey] || option.title || option.name || option.id }}</span>
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
interface Props {
  modelValue: string[] | null
  collection: string
  label?: string
  labelKey?: string
  filterFields?: string[],
  hideCreate?: boolean,
}

const props = withDefaults(defineProps<Props>(), {
  labelKey: 'title',
  filterFields: () => ['title', 'name'],
  modelValue: () => []
})

const emit = defineEmits<{
  'update:modelValue': [value: string[] | null]
}>()

const { open, close } = useCrouton()

// Fetch items from the referenced collection
const { items, pending, refresh, error } = await useCollectionQuery(props.collection)

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

// Instance-specific state to prevent cross-contamination between multiple forms
const localSelectedIds = ref<string[]>(props.modelValue || [])

// Watch props.modelValue for external changes
watch(() => props.modelValue, (newValue) => {
  localSelectedIds.value = newValue || []
})

// Computed v-model for two-way binding
const selected = computed({
  get: () => items.value.filter(item => localSelectedIds.value.includes(item.id)),
  set: (value: any[] | null) => {
    // USelectMenu with multiple emits an array of objects
    const ids = value ? value.map(v => typeof v === 'string' ? v : v?.id).filter(Boolean) : []
    localSelectedIds.value = ids
    emit('update:modelValue', ids.length > 0 ? ids : null)
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
    // A new item was added - find it and add to selection
    const newItem = items.value[items.value.length - 1]
    if (newItem) {
      const updatedIds = [...localSelectedIds.value, newItem.id]
      localSelectedIds.value = updatedIds
      emit('update:modelValue', updatedIds)
      isCreating.value = false
    }
  }
})

// Refresh items when component mounts to ensure we have latest data
onMounted(() => {
  refresh()
})
</script>