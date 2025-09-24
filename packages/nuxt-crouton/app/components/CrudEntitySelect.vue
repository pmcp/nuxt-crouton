<template>
  <div class="flex gap-2">
    <USelectMenu
      v-model="selected"
      :items="entities"
      value-key="id"
      :label-key="labelKey"
      :placeholder="`Select ${label}`"
      :loading="loading"
      :filter-fields="filterFields"
      class="flex-1"
      size="xl"
    />

    <UButton
      icon="i-lucide-plus"
      color="gray"
      size="md"
      @click="open('create', collection, [])"
    >
      {{ useFormatCollections().collectionWithCapitalSingular(collection) }}
      <span class="hidden md:inline">{{ useFormatCollections().collectionWithCapitalSingular(collection) }}</span>
    </UButton>
  </div>
</template>

<script setup lang="ts">
const { open } = useCrud()
const toast = useToast()

interface Entity {
  id: number
  name: string
  [key: string]: any
}

interface Props {
  modelValue: number | null
  label: string
  entityType: 'event' | 'category' | 'location'
  collection: string
  apiPath: string
  labelKey?: string
  filterFields?: string[]
  teamId?: string
}

const props = withDefaults(defineProps<Props>(), {
  labelKey: 'name',
  filterFields: () => ['name']
})

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const route = useRoute()
const teamId = computed(() => props.teamId || route.params.team as string)

// Use computed v-model pattern for cleaner two-way binding
const selected = computed({
  get: () => entities.value.find(e => e.id === props.modelValue) || null,
  set: (value: Entity | null) => emit('update:modelValue', value?.id || null)
})

// Fetch entities using useLazyFetch
const { data: entities, pending: loading, refresh, error } = await useLazyFetch<Entity[]>(
  () => `/api/teams/${teamId.value}/${props.apiPath}`,
  {
    server: false,
    default: () => [],
    watch: [teamId],
    onResponseError({ response }) {
      toast.add({
        title: 'Error',
        description: `Failed to fetch ${props.entityType}s: ${(response._data as any)?.message || 'Unknown error'}`,
        color: 'error'
      })
    }
  }
)
</script>
