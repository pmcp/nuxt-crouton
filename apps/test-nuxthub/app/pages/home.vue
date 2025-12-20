<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { user, logout } = useAuth()
const { activeOrganization } = useSession()
const router = useRouter()
const appConfig = useAppConfig()

// Get collections from registry
const collections = computed(() => {
  const croutonCollections = appConfig.croutonCollections || {}
  return Object.entries(croutonCollections).map(([key, config]) => ({
    key,
    name: formatCollectionName(key),
    config
  }))
})

// Format collection name for display (e.g., blogPosts -> Blog Posts)
function formatCollectionName(name: string) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

// Selected collection for viewing
const selectedCollection = ref<string | null>(null)

async function handleLogout() {
  await logout()
  router.push('/auth/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p v-if="user" class="text-sm text-gray-500 dark:text-gray-400">
            {{ user.email }}
          </p>
        </div>
        <UButton
          color="gray"
          variant="ghost"
          icon="i-lucide-log-out"
          @click="handleLogout"
        >
          Logout
        </UButton>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-4 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <!-- Sidebar: Collections List -->
        <aside class="lg:col-span-1">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 class="font-semibold text-gray-900 dark:text-white mb-4">
              Collections
            </h2>

            <div v-if="!collections.length" class="text-sm text-gray-500 dark:text-gray-400">
              No collections found. Run the generator to create collections.
            </div>

            <nav v-else class="space-y-1">
              <button
                v-for="collection in collections"
                :key="collection.key"
                class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors"
                :class="[
                  selectedCollection === collection.key
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                ]"
                @click="selectedCollection = collection.key"
              >
                {{ collection.name }}
              </button>
            </nav>

            <!-- User Info -->
            <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Account
              </h3>
              <div v-if="user" class="text-sm space-y-1">
                <p class="text-gray-900 dark:text-white truncate">
                  {{ user.name || user.email }}
                </p>
                <p class="text-gray-500 dark:text-gray-400 text-xs truncate">
                  {{ user.id }}
                </p>
              </div>
              <div v-if="activeOrganization" class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Org: {{ activeOrganization.name }}
              </div>
            </div>
          </div>
        </aside>

        <!-- Main Content: Collection Viewer -->
        <main class="lg:col-span-3">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow min-h-[400px]">
            <!-- No collection selected -->
            <div
              v-if="!selectedCollection"
              class="flex items-center justify-center h-[400px] text-gray-500 dark:text-gray-400"
            >
              <div class="text-center">
                <UIcon name="i-lucide-database" class="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a collection to view its contents</p>
              </div>
            </div>

            <!-- Collection Viewer -->
            <div v-else>
              <CroutonCollectionViewer
                :collection-name="selectedCollection"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>