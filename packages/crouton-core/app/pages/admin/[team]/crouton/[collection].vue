<script setup lang="ts">
/**
 * Admin Collection Viewer Page
 *
 * Generic page for viewing and managing any registered collection
 * from the team admin interface.
 *
 * @route /admin/[team]/crouton/[collection]
 */
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'team-admin']
})

const route = useRoute()
const { t } = useT()
const { getConfig } = useCollections()
const { collectionWithCapital } = useFormatCollections()

const collectionName = computed(() => route.params.collection as string)

const loading = ref(true)
const error = ref<string | null>(null)

// Get collection config for display
const collectionConfig = computed(() => getConfig(collectionName.value))

// Format collection name for display
const collectionTitle = computed(() => {
  const config = collectionConfig.value
  return config?.adminNav?.label || config?.displayName || collectionWithCapital(collectionName.value)
})

// Verify collection exists in registry
onMounted(() => {
  if (!collectionConfig.value) {
    error.value = `Collection not found: ${collectionName.value}`
  }
  loading.value = false
})
</script>

<template>
  <UDashboardPanel
    id="admin-collection"
    :ui="{ root: 'relative flex flex-col min-w-0 flex-1 h-full overflow-hidden' }"
  >
    <template #header>
      <UDashboardNavbar :title="collectionTitle">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <!-- Use default slot instead of body for full-height content without auto-scroll -->
    <div
      v-if="loading"
      class="italic opacity-50 flex items-center gap-2 p-4"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="animate-spin"
      />
      {{ t('common.loading') }}
    </div>

    <div
      v-else-if="error"
      class="text-red-600 p-4"
    >
      {{ error }}
    </div>

    <CroutonCollectionViewer
      v-else
      :collection-name="collectionName"
      class="flex-1 min-h-0"
    />
  </UDashboardPanel>
</template>
