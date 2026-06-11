<script setup lang="ts">
/**
 * Event Workspace shell (reusable)
 *
 * Kassa-first: resolves an event from its slug, then renders the header
 * (event switcher + actions) above the POS, which is the main surface. No
 * tabs — the two former tabs became header-driven panels:
 *
 *  - "Bewerken" expands the settings (SettingsTab) inline under the header
 *  - "Bestellingen" toggles the orders list (OrdersTab) as a third pane
 *    beside the POS's products/cart columns
 *
 * Used in two places:
 *  - the admin page `/admin/[team]/sales/events/[slug]`
 *  - the `eventWorkspaceBlock` CMS block (event fixed by the editor, so the
 *    switcher is hidden). NOTE: the block hides the header, so it currently
 *    shows the POS only — the settings/orders toggles live in the header.
 *
 * @see app/pages/admin/[team]/sales/events/[slug]/index.vue
 * @see app/components/Blocks/EventWorkspaceRender.vue
 */
// Reka UI splitter (the primitive Nuxt UI's resizable dashboard panels build
// on) — UDashboardPanel itself needs a top-level UDashboardGroup, which can't
// be embedded mid-page.
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import type { SalesEvent } from '~~/layers/sales/collections/events/types'

const props = withDefaults(defineProps<{
  /** Slug of the event to render. */
  eventSlug: string
  /**
   * Team route param used to build navigation targets (switch event).
   * Defaults to `route.params.team`, which is present in both admin
   * (`/admin/[team]/...`) and public CMS (`/[team]/...`) routes.
   */
  teamParam?: string
  /**
   * Legacy: used to sync the active tab to a URL query key. The workspace
   * has no tabs anymore — accepted for consumer compatibility, ignored.
   */
  tabParam?: string
  /** Show the event switcher dropdown (hidden in the block — event is fixed). */
  showSwitcher?: boolean
  /** Show the header action buttons (settings / orders toggles). */
  showHeaderActions?: boolean
  /**
   * Show the whole header row (event name + actions). Hidden in the block,
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

function openCreateEvent() {
  open('create', 'salesEvents')
}

// The workspace's own event can be deleted from the settings panel — once the
// delete mutation lands this page has nothing to show, so fall back to the
// events list.
const unhookMutation = useNuxtApp().hook('crouton:mutation', (payload: any) => {
  if (
    payload.operation === 'delete'
    && payload.collection === 'salesEvents'
    && event.value
    && payload.itemIds?.includes(event.value.id)
  ) {
    router.push(`/admin/${teamParam.value}/sales/events`)
  }
})
onUnmounted(unhookMutation)

// Header-driven panels. Local state — not worth query params, and the CMS
// block (showHeaderActions=false) never exposes the toggles.
const settingsOpen = ref(false)
const ordersOpen = ref(false)
</script>

<template>
  <div v-if="!event" class="flex items-center justify-center h-full">
    <div class="text-center">
      <UIcon name="i-lucide-alert-circle" class="text-4xl text-muted mb-2" />
      <p class="text-muted">{{ t('sales.events.eventNotFound') }}</p>
    </div>
  </div>

  <div v-else class="space-y-4">
    <!-- Header -->
    <div v-if="showHeader" class="flex items-start justify-between">
      <div class="space-y-1">
        <USelectMenu
          v-if="showSwitcher"
          :model-value="event.id"
          :items="eventOptions"
          value-key="id"
          :placeholder="t('sales.events.selectEvent')"
          icon="i-lucide-ticket"
          size="lg"
          class="w-72"
          :ui="{ base: 'font-semibold text-lg' }"
          @update:model-value="switchEvent"
        >
          <!-- Create-from-dropdown, same pattern as CroutonFormReferenceSelect -->
          <template #content-top>
            <div class="p-1">
              <UButton
                color="neutral"
                icon="i-lucide-plus"
                variant="soft"
                block
                @click="openCreateEvent"
              >
                {{ t('reference.createNew', { label: t('sales.events.title') }) }}
              </UButton>
            </div>
          </template>
        </USelectMenu>
        <h2 v-else class="font-semibold text-lg">{{ event.title }}</h2>
        <p v-if="event.eventType" class="text-muted text-sm">
          {{ event.eventType }}
        </p>
      </div>
      <div v-if="showHeaderActions" class="flex gap-2">
        <UButton
          icon="i-lucide-receipt"
          size="sm"
          color="primary"
          :variant="ordersOpen ? 'solid' : 'soft'"
          @click="ordersOpen = !ordersOpen"
        >
          {{ t('sales.orders.title') }}
        </UButton>
        <UButton
          icon="i-lucide-pencil"
          size="sm"
          color="neutral"
          :variant="settingsOpen ? 'solid' : 'outline'"
          @click="settingsOpen = !settingsOpen"
        >
          {{ t('sales.events.edit') }}
        </UButton>
      </div>
    </div>

    <!-- Settings: expands under the header ("Bewerken"). Own Suspense —
         SettingsTab is an async-setup component. Contained in a bordered
         panel so the expansion reads as one block, not loose cards. -->
    <UCollapsible :open="settingsOpen">
      <template #content>
        <div class="border border-default rounded-xl bg-elevated/20 p-4 sm:p-6 mb-4">
          <Suspense>
            <SalesEventWorkspaceSettingsTab :event="event" />
            <template #fallback>
              <div class="p-6 text-center text-muted">{{ t('sales.common.loading') }}</div>
            </template>
          </Suspense>
        </div>
      </template>
    </UCollapsible>

    <!-- Kassa: the main surface. Orders join as a resizable pane on toggle
         (drag the divider; sizes persist via autoSaveId). -->
    <SplitterGroup
      direction="horizontal"
      auto-save-id="sales-workspace-pos"
      class="flex border border-default rounded-xl overflow-clip bg-default h-[75vh]"
    >
      <SplitterPanel :min-size="35" class="min-w-0">
        <!-- No panel header: the workspace header above already names the
             event (the standalone order page keeps it). -->
        <SalesPosPanel :event-slug="event.slug" :team-param="teamParam" :show-header="false" />
      </SplitterPanel>
      <template v-if="ordersOpen">
        <SplitterResizeHandle
          class="w-1 shrink-0 bg-accented hover:bg-primary/60 data-[state=drag]:bg-primary transition-colors"
        />
        <SplitterPanel :default-size="30" :min-size="18" class="min-w-0 overflow-y-auto p-4">
          <Suspense>
            <SalesEventWorkspaceOrdersTab :event="event" />
            <template #fallback>
              <div class="p-6 text-center text-muted">{{ t('sales.common.loading') }}</div>
            </template>
          </Suspense>
        </SplitterPanel>
      </template>
    </SplitterGroup>
  </div>
</template>
