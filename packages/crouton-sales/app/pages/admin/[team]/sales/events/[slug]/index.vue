<script setup lang="ts">
/**
 * Event Workspace shell
 *
 * Resolves the event from slug, renders header (switcher + actions) + tabs.
 * Each tab content lives in <SalesEventWorkspace*Tab /> components and does
 * its own data fetching via `useCollectionQuery` (Nuxt dedupes shared state).
 *
 * @route /admin/[team]/sales/events/[slug]
 */
import type { SalesEvent } from '~~/layers/sales/collections/events/types'

definePageMeta({ middleware: ['auth'] })

const { open } = useCrouton()
const route = useRoute()
const router = useRouter()

// Use route param directly (NOT useTeamContext().teamSlug.value) to avoid
// SSR/CSR hydration mismatch — useTeamContext returns UUID on server vs slug on client.
const teamParam = computed(() => route.params.team as string)
const eventSlug = computed(() => route.params.slug as string)

const { items: events } = await useCollectionQuery('salesEvents')

const event = computed(() =>
  (events.value as SalesEvent[] | null)?.find(e => e.slug === eventSlug.value)
)

const eventOptions = computed(() =>
  (events.value as SalesEvent[] | null)?.map(e => ({
    id: e.id,
    label: e.title,
    slug: e.slug
  })) || []
)

function switchEvent(eventId: string) {
  const selected = eventOptions.value.find(e => e.id === eventId)
  if (selected && selected.slug !== eventSlug.value) {
    router.push(`/admin/${teamParam.value}/sales/events/${selected.slug}`)
  }
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString()
}

function openEditEvent() {
  if (!event.value) return
  open('update', 'salesEvents', [event.value.id])
}

const duplicating = ref(false)
async function duplicateEvent() {
  if (!event.value) return
  duplicating.value = true
  try {
    const response = await $fetch<{ slug?: string }>(
      `/api/crouton-sales/teams/${teamParam.value}/events/${event.value.id}/duplicate`,
      { method: 'POST' }
    )
    if (response?.slug) {
      router.push(`/admin/${teamParam.value}/sales/events/${response.slug}`)
    }
  }
  finally {
    duplicating.value = false
  }
}

const activeTab = ref('products')
const tabItems = [
  { label: 'Products', value: 'products', icon: 'i-lucide-package' },
  { label: 'Orders', value: 'orders', icon: 'i-lucide-receipt' },
  { label: 'Printers', value: 'printers', icon: 'i-lucide-printer' },
  { label: 'Settings', value: 'settings', icon: 'i-lucide-settings' }
]
</script>

<template>
  <div v-if="!event" class="flex items-center justify-center h-full">
    <div class="text-center">
      <UIcon name="i-lucide-alert-circle" class="text-4xl text-muted mb-2" />
      <p class="text-muted">Event not found</p>
    </div>
  </div>

  <div v-else class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div class="space-y-1">
        <USelectMenu
          :model-value="event.id"
          :items="eventOptions"
          value-key="id"
          placeholder="Select event..."
          icon="i-lucide-calendar"
          size="lg"
          class="w-72"
          :ui="{ base: 'font-semibold text-lg' }"
          @update:model-value="switchEvent"
        />
        <p class="text-muted text-sm">
          {{ event.eventType }}
          <span v-if="event.startDate"> &middot; {{ formatDate(event.startDate) }}</span>
          <span v-if="event.endDate"> - {{ formatDate(event.endDate) }}</span>
        </p>
      </div>
      <div class="flex gap-2">
        <UButton variant="outline" icon="i-lucide-pencil" size="sm" @click="openEditEvent">
          Edit
        </UButton>
        <UButton
          variant="outline"
          icon="i-lucide-copy"
          size="sm"
          :loading="duplicating"
          @click="duplicateEvent"
        >
          Duplicate
        </UButton>
        <UButton
          icon="i-lucide-shopping-cart"
          size="sm"
          :to="`/order/${teamParam}/${event.slug}`"
        >
          Open POS
        </UButton>
      </div>
    </div>

    <!-- Tabs -->
    <UTabs v-model="activeTab" :items="tabItems" :content="false" />

    <!-- Tab content -->
    <div class="min-h-[400px]">
      <SalesEventWorkspaceProductsTab v-if="activeTab === 'products'" :event="event" />
      <SalesEventWorkspaceOrdersTab v-if="activeTab === 'orders'" :event="event" />
      <SalesEventWorkspacePrintersTab v-if="activeTab === 'printers'" :event="event" />
      <SalesEventWorkspaceSettingsTab v-if="activeTab === 'settings'" :event="event" />
    </div>
  </div>
</template>
