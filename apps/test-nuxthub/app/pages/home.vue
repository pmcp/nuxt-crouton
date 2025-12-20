<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { user } = useSession()
const { currentTeam } = useTeam()

// Get list of collections from the registry
const collections = computed(() => {
  const registry = useAppConfig().crouton?.collections || {}
  return Object.keys(registry)
})

const selectedCollection = ref(collections.value[0] || '')
</script>

<template>
  <div class="min-h-screen p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-2xl font-bold">Dashboard</h1>
          <p class="text-muted">Welcome, {{ user?.name }}</p>
        </div>
        <div class="flex items-center gap-4">
          <span v-if="currentTeam" class="text-sm text-muted">
            Team: {{ currentTeam.name }}
          </span>
          <NuxtLink to="/auth/logout">
            <UButton variant="ghost" color="neutral">Logout</UButton>
          </NuxtLink>
        </div>
      </div>

      <!-- Collection Selector -->
      <div v-if="collections.length > 0" class="mb-6">
        <USelect
          v-model="selectedCollection"
          :options="collections"
          placeholder="Select a collection"
          class="w-64"
        />
      </div>

      <!-- Collection Viewer -->
      <CroutonCollectionViewer
        v-if="selectedCollection"
        :collection-name="selectedCollection"
      />

      <div v-else class="text-center py-12 text-muted">
        <p>No collections found. Generate one with:</p>
        <code class="block mt-2 bg-muted/20 p-2 rounded">pnpm crouton config</code>
      </div>
    </div>
  </div>
</template>