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

    <!-- Normal select menu -->
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
      class="w-full"
    >
      <template #option="{ option }">
        <span>{{ option[labelKey] || option.title || option.name || option.id }}</span>
      </template>

      <template #content-top>
        <div class="p-1">
          <UButton
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
  modelValue: string | null
  collection: string
  label?: string
  labelKey?: string
  filterFields?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  labelKey: 'title',
  filterFields: () => ['title', 'name']
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
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
const localSelectedId = ref<string | null>(props.modelValue)

// Watch props.modelValue for external changes
watch(() => props.modelValue, (newValue) => {
  localSelectedId.value = newValue
})

// Computed v-model for two-way binding
const selected = computed({
  get: () => items.value.find(item => item.id === localSelectedId.value) || null,
  set: (value: any | null) => {
    // USelectMenu with value-key emits the ID string directly, not the object
    const id = typeof value === 'string' ? value : value?.id
    localSelectedId.value = id
    emit('update:modelValue', id || null)
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
    // The newest item should be the last one (or we could check by timestamp)
    const newItem = items.value[items.value.length - 1]
    if (newItem) {
      localSelectedId.value = newItem.id
      emit('update:modelValue', newItem.id)
      isCreating.value = false
    }
  }
})

// Refresh items when component mounts to ensure we have latest data
onMounted(() => {
  refresh()
})
</script>
