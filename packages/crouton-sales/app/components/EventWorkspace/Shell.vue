<script setup lang="ts">
/**
 * Event Workspace shell (reusable)
 *
 * Resolves an event from its slug, then renders the header (event switcher +
 * actions) and the four workspace tabs (Products / Orders / Printers /
 * Settings). Each tab content lives in <SalesEventWorkspace*Tab /> and does its
 * own data fetching via `useCollectionQuery` (Nuxt dedupes shared state).
 *
 * Used in two places:
 *  - the admin page `/admin/[team]/sales/events/[slug]` (full chrome, tab synced
 *    to `?tab=`)
 *  - the `eventWorkspaceBlock` CMS block (event fixed by the editor, so the
 *    switcher is hidden and the tab stays local state by default)
 *
 * @see app/pages/admin/[team]/sales/events/[slug]/index.vue
 * @see app/components/Blocks/EventWorkspaceRender.vue
 */
import type { SalesEvent } from '~~/layers/sales/collections/events/types'

const props = withDefaults(defineProps<{
  /** Slug of the event to render. */
  eventSlug: string
  /**
   * Team route param used to build navigation targets (switch event, Open POS).
   * Defaults to `route.params.team`, which is present in both admin
   * (`/admin/[team]/...`) and public CMS (`/[team]/...`) routes.
   */
  teamParam?: string
  /**
   * Query-key to persist the active tab in the URL (e.g. 'tab' → `?tab=orders`).
   * When unset the active tab is local component state — preferred for the CMS
   * block, where a bare query param could collide with other blocks or the
   * page's own params.
   */
  tabParam?: string
  /** Show the event switcher dropdown (hidden in the block — event is fixed). */
  showSwitcher?: boolean
  /** Show the Edit / Duplicate / Open POS header actions. */
  showHeaderActions?: boolean
  /**
   * Show the whole header row (event name/date + actions). Hidden in the block,
   * where the page already provides the event title and these actions don't
   * apply.
   */
  showHeader?: boolean
}>(), {
  showSwitcher: true,
  showHeaderActions: true,
  showHeader: true
})

const { t } = useT()
const { open } = useCrouton()
const route = useRoute()
const router = useRouter()

const teamParam = computed(() => props.teamParam || (route.params.team as string))
const eventSlug = computed(() => props.eventSlug)

const { items: events, refresh: refreshEvents } = await useCollectionQuery('salesEvents')

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
      // Refresh the cached events list so the freshly-duplicated event is
      // present before we navigate — otherwise the workspace resolves the new
      // slug against the stale list and shows "Event not found".
      await refreshEvents()
      router.push(`/admin/${teamParam.value}/sales/events/${response.slug}`)
    }
  }
  finally {
    duplicating.value = false
  }
}

const tabItems = [
  { label: t('sales.products.title'), value: 'products', icon: 'i-lucide-package' },
  { label: t('sales.orders.title'), value: 'orders', icon: 'i-lucide-receipt' },
  { label: t('sales.sidebar.printers'), value: 'printers', icon: 'i-lucide-printer' },
  { label: t('sales.events.settings'), value: 'settings', icon: 'i-lucide-settings' }
]

// Active tab: synced to a URL query key when `tabParam` is set (deep-linkable,
// survives refresh), otherwise plain local state. `router.replace` keeps tab
// switches out of the browser history.
const localTab = ref('products')
const activeTab = computed({
  get() {
    if (props.tabParam) {
      const q = route.query[props.tabParam]
      const value = Array.isArray(q) ? q[0] : q
      return (value && tabItems.some(i => i.value === value)) ? value : 'products'
    }
    return localTab.value
  },
  set(value: string) {
    if (props.tabParam) {
      router.replace({ query: { ...route.query, [props.tabParam]: value } })
    }
    else {
      localTab.value = value
    }
  }
})
</script>

<template>
  <div v-if="!event" class="flex items-center justify-center h-full">
    <div class="text-center">
      <UIcon name="i-lucide-alert-circle" class="text-4xl text-muted mb-2" />
      <p class="text-muted">{{ t('sales.events.eventNotFound') }}</p>
    </div>
  </div>

  <div v-else class="space-y-6">
    <!-- Header -->
    <div v-if="showHeader" class="flex items-start justify-between">
      <div class="space-y-1">
        <USelectMenu
          v-if="showSwitcher"
          :model-value="event.id"
          :items="eventOptions"
          value-key="id"
          :placeholder="t('sales.events.selectEvent')"
          icon="i-lucide-calendar"
          size="lg"
          class="w-72"
          :ui="{ base: 'font-semibold text-lg' }"
          @update:model-value="switchEvent"
        />
        <h2 v-else class="font-semibold text-lg">{{ event.title }}</h2>
        <p class="text-muted text-sm">
          {{ event.eventType }}
          <span v-if="event.startDate"> &middot; {{ formatDate(event.startDate) }}</span>
          <span v-if="event.endDate"> - {{ formatDate(event.endDate) }}</span>
        </p>
      </div>
      <div v-if="showHeaderActions" class="flex gap-2">
        <UButton variant="outline" icon="i-lucide-pencil" size="sm" @click="openEditEvent">
          {{ t('sales.events.edit') }}
        </UButton>
        <UButton
          variant="outline"
          icon="i-lucide-copy"
          size="sm"
          :loading="duplicating"
          @click="duplicateEvent"
        >
          {{ t('sales.events.duplicate') }}
        </UButton>
        <UButton
          icon="i-lucide-shopping-cart"
          size="sm"
          :to="`/order/${teamParam}/${event.slug}`"
        >
          {{ t('sales.events.openPos') }}
        </UButton>
      </div>
    </div>

    <!-- Tabs -->
    <UTabs v-model="activeTab" :items="tabItems" :content="false" />

    <!-- Tab content -->
    <!--
      Each tab component runs top-level `await useCollectionQuery`, so it's an
      async-setup component. Keying a <Suspense> on activeTab gives every tab its
      own async boundary that is cleanly torn down on switch — without it, rapid
      tab switching unmounts a still-resolving tab and Vue patches a detached
      subtree (NotFoundError: insertBefore / "Cannot read properties of null
      (reading 'subTree')").
    -->
    <div class="min-h-[400px]">
      <Suspense :key="activeTab">
        <SalesEventWorkspaceProductsTab v-if="activeTab === 'products'" :event="event" />
        <SalesEventWorkspaceOrdersTab v-else-if="activeTab === 'orders'" :event="event" />
        <SalesEventWorkspacePrintersTab v-else-if="activeTab === 'printers'" :event="event" />
        <SalesEventWorkspaceSettingsTab v-else-if="activeTab === 'settings'" :event="event" />
        <template #fallback>
          <div class="p-6 text-center text-muted">{{ t('sales.common.loading') }}</div>
        </template>
      </Suspense>
    </div>
  </div>
</template>