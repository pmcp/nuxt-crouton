<script setup lang="ts">
// Test sales app - dogfooding crouton-sales package

const { teamSlug } = useTeamContext()

// Build admin URL for a collection
const adminUrl = (collection: string) => `/dashboard/${teamSlug.value}/crouton/${collection}`

// Collections to display
const collections = [
  { name: 'Events', slug: 'sales-events' },
  { name: 'Products', slug: 'sales-products' },
  { name: 'Categories', slug: 'sales-categories' },
  { name: 'Orders', slug: 'sales-orders' },
  { name: 'Locations', slug: 'sales-locations' },
  { name: 'Clients', slug: 'sales-clients' },
]
</script>

<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-4">Test Sales App</h1>
    <p class="text-neutral-500 mb-2">Dogfooding the @friendlyinternet/crouton-sales package</p>
    <p v-if="teamSlug" class="text-sm text-neutral-400 mb-8">
      Team: <code class="bg-neutral-800 px-2 py-0.5 rounded">{{ teamSlug }}</code>
    </p>
    <p v-else class="text-sm text-amber-500 mb-8">
      No team selected. <NuxtLink to="/auth/login" class="underline">Login</NuxtLink> to access collections.
    </p>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <!-- Core Collections -->
      <UCard v-for="col in collections" :key="col.slug">
        <template #header>
          <h2 class="font-semibold">{{ col.name }}</h2>
        </template>
        <NuxtLink v-if="teamSlug" :to="adminUrl(col.slug)" class="text-primary">
          Manage {{ col.name }}
        </NuxtLink>
        <span v-else class="text-neutral-500">Login required</span>
      </UCard>

      <!-- POS Interface -->
      <UCard class="md:col-span-2 lg:col-span-3 border-primary">
        <template #header>
          <h2 class="font-semibold text-primary">Order Interface</h2>
        </template>
        <p class="text-sm text-neutral-500 mb-4">
          Test the SalesClientOrderInterface component
        </p>
        <NuxtLink to="/order" class="text-primary font-medium">
          Open POS Interface
        </NuxtLink>
      </UCard>
    </div>
  </div>
</template>
