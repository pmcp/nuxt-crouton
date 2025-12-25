<script setup lang="ts">
// Test page for SalesClientOrderInterface component
// This tests the full POS flow: products, cart, checkout
// Usage: /order?eventId=xxx or navigate from events list

definePageMeta({
  layout: false
})

const route = useRoute()
const eventId = computed(() => route.query.eventId as string | undefined)
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-900">
    <div class="p-4">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-xl font-bold">POS Order Interface</h1>
        <NuxtLink to="/" class="text-primary text-sm">
          Back to Dashboard
        </NuxtLink>
      </div>

      <!-- Show event selector if no eventId provided -->
      <template v-if="!eventId">
        <UCard>
          <template #header>
            <h2 class="font-semibold">Select an Event</h2>
          </template>
          <p class="text-neutral-600 dark:text-neutral-400 text-sm mb-4">
            To test the order interface, first create an event with products, then navigate here with an eventId query parameter.
          </p>
          <p class="text-sm">
            Example: <code class="bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">/order?eventId=your-event-id</code>
          </p>
          <template #footer>
            <NuxtLink to="/admin/sales-events" class="text-primary">
              Manage Events →
            </NuxtLink>
          </template>
        </UCard>
      </template>

      <!-- Show the POS interface when eventId is available -->
      <template v-else>
        <p class="text-neutral-600 dark:text-neutral-400 text-sm mb-4">
          Testing SalesClientOrderInterface for event: {{ eventId }}
        </p>

        <!-- The main POS interface component from crouton-sales -->
        <SalesClientOrderInterface :event-id="eventId" />
      </template>
    </div>
  </div>
</template>
