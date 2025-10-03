<template>
  <div class="flex gap-2 items-start">
    <USelectMenu
      v-model="selected"
      :items="items"
      value-key="id"
      :label-key="labelKey"
      :placeholder="`Select ${label || collection}`"
      :loading="pending"
      :filter-fields="filterFields"
      class="flex-1"
      size="xl"
      searchable
    >
      <template #option="{ option }">
        <span>{{ option[labelKey] || option.title || option.name || option.id }}</span>
      </template>
    </USelectMenu>

    <UButton
      icon="i-lucide-plus"
      color="gray"
      size="xl"
      square
      @click="handleCreate"
      :title="`Create new ${label || collection}`"
    />
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
const { items, pending, refresh } = await useCollectionQuery(props.collection)

// Computed v-model for two-way binding
const selected = computed({
  get: () => items.value.find(item => item.id === props.modelValue) || null,
  set: (value: any | null) => {
    emit('update:modelValue', value?.id || null)
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
      selected.value = newItem
      isCreating.value = false
    }
  }
})

// Refresh items when component mounts to ensure we have latest data
onMounted(() => {
  refresh()
})
</script>
