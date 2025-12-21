<script setup lang="ts">
interface CollectionConfig {
  name?: string
  layer?: string
  apiPath?: string
  componentName?: string
  columns?: Array<{ accessorKey: string; header: string }>
  sortable?: { enabled: boolean; orderField?: string }
  hierarchy?: { enabled: boolean; parentField?: string }
}

interface StatsResponse {
  success: boolean
  data: Record<string, { count: number }>
}

// Get collections from app config
const appConfig = useAppConfig()
const croutonCollections = computed(() => {
  return (appConfig.croutonCollections || {}) as Record<string, CollectionConfig>
})

const collectionNames = computed(() => Object.keys(croutonCollections.value))
const hasCollections = computed(() => collectionNames.value.length > 0)

// Fetch stats from API
const { data: statsResponse, pending: statsPending, error: statsError, refresh: refreshStats } = await useFetch<StatsResponse>('/api/crouton/setup/stats', {
  default: () => ({ success: false, data: {} })
})

const stats = computed(() => statsResponse.value?.data || {} as Record<string, { count: number }>)

// Helper to get collection config with fallback
const getCollectionConfig = (name: string): CollectionConfig => {
  return croutonCollections.value[name] || {}
}
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Collections</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          Manage your crouton collections
        </p>
      </div>
      <UButton
        v-if="hasCollections"
        color="neutral"
        variant="ghost"
        icon="i-lucide-refresh-cw"
        :loading="statsPending"
        @click="refreshStats()"
      >
        Refresh Stats
      </UButton>
    </div>

    <!-- Collections Grid -->
    <div v-if="hasCollections">
      <!-- Loading skeleton -->
      <div
        v-if="statsPending && !stats"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <UCard
          v-for="i in Math.min(collectionNames.length, 6)"
          :key="i"
        >
          <div class="space-y-3">
            <USkeleton class="h-6 w-32" />
            <USkeleton class="h-4 w-48" />
            <USkeleton class="h-4 w-24" />
          </div>
        </UCard>
      </div>

      <!-- Collection cards -->
      <div
        v-else
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <CroutonSetupDashboardCollectionCard
          v-for="name in collectionNames"
          :key="name"
          :name="name"
          :config="getCollectionConfig(name)"
          :count="stats[name]?.count"
        />
      </div>

      <!-- Error state -->
      <div
        v-if="statsError"
        class="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2"
      >
        <UIcon name="i-lucide-alert-circle" class="w-5 h-5" />
        <span>Failed to load collection stats</span>
        <UButton
          color="error"
          variant="ghost"
          size="xs"
          @click="refreshStats()"
        >
          Retry
        </UButton>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="text-center py-12"
    >
      <UIcon name="i-lucide-database" class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
      <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">No collections found</h3>
      <p class="mt-2 text-gray-500 dark:text-gray-400">
        Run the crouton generator to create your first collection.
      </p>
      <div class="mt-4">
        <code class="text-sm bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded">
          pnpm crouton generate
        </code>
      </div>
    </div>

    <!-- Config Viewer -->
    <USeparator />
    <CroutonSetupDashboardConfigViewer />
  </div>
</template>
