<script setup lang="ts">
const { open } = useCrouton()

const props = defineProps<{
  id: string
  collection: string
}>()

// Fetch the item using the new composable
// Use computed to create a reactive reference instead of arrow function
// This prevents SSR hydration mismatches where the function gets stringified
const { item, pending, error, refresh } = await useCollectionItem(props.collection, computed(() => props.id))

// Convert collection name to expected component name
// 'bookingsLocations' → 'BookingsLocationsCardMini'
// 'users' → 'UsersCardMini'
const componentName = computed(() => {
  const name = props.collection.charAt(0).toUpperCase() + props.collection.slice(1)
  return `Crouton${name}CardMini`
})

// Check if custom component exists in Vue's global component registry
const nuxtApp = useNuxtApp()
const customComponent = computed(() => {
  return nuxtApp.vueApp.component(componentName.value) || null
})
</script>

<template>
  <!-- Use custom component if it exists -->
  <component
    v-if="customComponent"
    :is="customComponent"
    :item="item"
    :pending="pending"
    :error="error"
    :id="id"
    :collection="collection"
    :refresh="refresh"
  />

  <!-- Default fallback rendering -->
  <div v-else class="group relative">

      <UBadge
        color="neutral"
        variant="subtle"
        size="lg"
        class="relative z-10"
        :ui="{base: 'w-full font-medium inline-flex items-center center text-center justify-center'}"
    >
        <USkeleton v-if="pending" class="h-4 w-full" />
        <span v-else-if="item">{{ item.title }}</span>
        <span v-else-if="error" class="text-red-500">Error loading</span>
    </UBadge>

    <div class="bg-neutral absolute -top-1 right-2 transition-all delay-150 duration-300 ease-in-out group-hover:-top-6 group-hover:scale-110">
      <CroutonItemButtonsMini
          v-if="item"
          update
          @update="open('update', collection, [id])"
          buttonClasses="hover:scale-110 hover:color-neutral-800 pb-2"
          containerClasses="flex flex-row gap-[2px]"
      />
    </div>

  </div>
</template>
