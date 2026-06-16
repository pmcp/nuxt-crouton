<script setup lang="ts">
/**
 * Live Dashboard block — public renderer (#179, epic #175 — D1 live mirror).
 *
 * The "see the venue's live data online" surface: one event's mirror-fresh
 * orders + sales, read from the Cloudflare D1 mirror. It is deliberately a
 * composition of pieces that already exist — a mirror-freshness banner
 * (SalesSyncStatus), a sales summary built on the chart endpoints
 * (SalesDashboardSalesSummary), and the same live orders list as the workspace
 * "Bestellingen" pane (SalesEventWorkspaceOrdersTab). The only thing new to
 * #179 is the freshness banner that makes the mirror nature explicit.
 *
 * Team-members-only: the orders + chart data come from team-scoped admin
 * endpoints, so anyone not signed in as a team member gets a hint, not an error
 * (same posture as salesOrdersBlock). The event is resolved member-side via the
 * shared SalesBlocksEventResolver inside <Suspense> (it and OrdersTab both
 * top-level await). clientOnly — BlockContent wraps us in <ClientOnly>.
 */
interface LiveDashboardAttrs {
  eventSlug?: string
  title?: string
}

const props = defineProps<{ attrs: LiveDashboardAttrs }>()

const { t } = useT()
const { loggedIn } = useAuth()
const route = useRoute()

const eventSlug = computed(() => props.attrs.eventSlug || '')
const teamParam = computed(() => String(route.params.team || ''))
</script>

<template>
  <div class="sales-live-dashboard-block">
    <!-- Editor didn't pick an event -->
    <div
      v-if="!eventSlug"
      class="bg-muted/80 rounded-3xl border border-dashed border-default p-6 text-center text-sm text-muted"
    >
      <UIcon name="i-lucide-layout-dashboard" class="w-6 h-6 mx-auto mb-2 text-muted" />
      {{ t('sales.block.noEventPicked') }}
    </div>

    <!-- Team-members-only: anonymous visitors don't see mirrored data. -->
    <div
      v-else-if="!loggedIn"
      class="bg-muted/80 rounded-3xl border border-dashed border-default p-6 text-center text-sm text-muted"
    >
      <UIcon name="i-lucide-lock" class="w-6 h-6 mx-auto mb-2 text-muted" />
      {{ t('sales.blocks.liveDashboard.ui.teamOnly') }}
    </div>

    <!-- Signed-in team member → the live dashboard. -->
    <div v-else class="rounded-3xl bg-default p-6 space-y-6">
      <Suspense>
        <SalesBlocksEventResolver
          v-slot="{ event }"
          :event-slug="eventSlug"
          :not-found-label="t('sales.blocks.liveDashboard.ui.eventNotFound')"
        >
          <!-- Header: event title + the mirror-freshness banner -->
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-lg font-semibold">
              {{ props.attrs.title || event.title || t('sales.blocks.liveDashboard.ui.defaultTitle') }}
            </h2>
            <SalesSyncStatus :team-param="teamParam" />
          </div>

          <!-- Sales summary (headline numbers + top products) -->
          <SalesDashboardSalesSummary
            :team-param="teamParam"
            :event-id="event.id"
            :currency="event.currency"
          />

          <!-- Live orders (same list as the workspace "Bestellingen" pane) -->
          <div class="rounded-2xl border border-default bg-elevated/40 p-4">
            <SalesEventWorkspaceOrdersTab :event="event" />
          </div>
        </SalesBlocksEventResolver>
        <template #fallback>
          <div class="p-6 text-center text-muted">{{ t('sales.common.loading') }}</div>
        </template>
      </Suspense>
    </div>
  </div>
</template>
