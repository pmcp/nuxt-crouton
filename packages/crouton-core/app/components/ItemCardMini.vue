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

// Display config for smart rendering
const display = useDisplayConfig(props.collection)

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

// Helper to get translated field value with fallback chain
// Checks translations.{locale}.{field} with fallback locales, then field itself
const getTranslatedField = (entity: any, field: string): string | null => {
  if (!entity) return null

  // First check direct field value
  const directValue = entity[field]
  if (directValue && typeof directValue === 'string' && directValue.trim()) {
    return directValue
  }

  // Check translations if available
  const translations = entity.translations
  if (translations && typeof translations === 'object') {
    // Try common locales in order of preference
    const locales = ['en', 'nl', 'fr', 'de', 'es', 'it', 'pt']
    for (const locale of locales) {
      const translatedValue = translations[locale]?.[field]
      if (translatedValue && typeof translatedValue === 'string' && translatedValue.trim()) {
        return translatedValue
      }
    }
  }

  return null
}

// Determine best display label using display config, then fallback
const displayLabel = computed(() => {
  if (!item.value) return null

  // Use display config title field first
  if (display.title) {
    const value = getTranslatedField(item.value, display.title)
    if (value) return value
  }

  // Fallback: try common fields (with translations)
  const title = getTranslatedField(item.value, 'title')
  if (title) return title
  const name = getTranslatedField(item.value, 'name')
  if (name) return name
  const label = getTranslatedField(item.value, 'label')
  if (label) return label

  return props.id
})

// Image from display config (for avatar/thumbnail)
const imageUrl = computed(() => {
  if (!display.image || !item.value) return null
  return item.value[display.image] || null
})

// Badge from display config
const badgeValue = computed(() => {
  if (!display.badge || !item.value) return null
  return item.value[display.badge] ? String(item.value[display.badge]) : null
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

  <!-- Display-aware rendering -->
  <div
    v-else
    class="group relative"
  >
    <UBadge
      color="neutral"
      variant="subtle"
      size="lg"
      :ui="{ base: 'font-medium inline-flex items-center gap-1.5' }"
    >
      <USkeleton
        v-if="pending"
        class="h-4 w-16"
      />
      <template v-else-if="item">
        <!-- Avatar/thumbnail from display config -->
        <UAvatar
          v-if="imageUrl"
          :src="imageUrl"
          :alt="displayLabel || ''"
          size="2xs"
        />
        <span>{{ displayLabel }}</span>
        <!-- Inline badge from display config -->
        <span
          v-if="badgeValue"
          class="text-[10px] opacity-60"
        >
          {{ badgeValue }}
        </span>
      </template>
      <span
        v-else-if="error"
        class="text-red-500"
      >Error loading</span>
    </UBadge>

    <div class="bg-neutral absolute -top-1 right-2 transition-all delay-150 duration-300 ease-in-out group-hover:-top-6 group-hover:scale-110">
      <CroutonItemButtonsMini
        v-if="item"
        update
        button-classes="hover:scale-110 hover:color-neutral-800 pb-2"
        container-classes="flex flex-row gap-[2px]"
        @update="open('update', collection, [id])"
      />
    </div>
  </div>
</template>
