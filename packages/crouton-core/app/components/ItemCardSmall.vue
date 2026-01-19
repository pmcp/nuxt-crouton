<script setup lang="ts">
const { open } = useCrouton()

const props = defineProps<{
  id: string
  collection: string
  item?: any // Optional - if provided, skip fetching
}>()

// Only fetch if item not provided
const shouldFetch = !props.item

// Fetch the item using the composable (skip if item already provided)
const { item: fetchedItem, pending, error, refresh } = shouldFetch
  ? await useCollectionItem(props.collection, computed(() => props.id))
  : { item: ref(null), pending: ref(false), error: ref(null), refresh: () => {} }

// Use provided item or fetched item
const item = computed(() => props.item || fetchedItem.value)

// Convert collection name to expected component name
// 'users' → 'CroutonUsersCardSmall'
const componentName = computed(() => {
  const name = props.collection.charAt(0).toUpperCase() + props.collection.slice(1)
  return `Crouton${name}CardSmall`
})

// Check if custom component exists
const nuxtApp = useNuxtApp()
const customComponent = computed(() => {
  return nuxtApp.vueApp.component(componentName.value) || null
})
</script>

<template>
  <!-- Use custom component if it exists -->
  <component
    :is="customComponent"
    v-if="customComponent"
    :id="id"
    :item="item"
    :pending="pending"
    :error="error"
    :collection="collection"
    :refresh="refresh"
  />

  <!-- Default fallback rendering -->
  <div
    v-else
    class="flex items-center gap-2 min-w-0"
  >
    <USkeleton
      v-if="pending"
      class="h-4 w-24"
    />
    <template v-else-if="item">
      <UIcon
        v-if="item.icon"
        :name="item.icon"
        class="size-4 shrink-0"
      />
      <span class="truncate">{{ item.title || item.name || item.label || item.id }}</span>
      <UBadge
        v-if="item.status"
        color="neutral"
        size="xs"
        variant="subtle"
      >
        {{ item.status }}
      </UBadge>
    </template>
    <span
      v-else-if="error"
      class="text-red-500 text-sm"
    >Error loading</span>
  </div>
</template>
