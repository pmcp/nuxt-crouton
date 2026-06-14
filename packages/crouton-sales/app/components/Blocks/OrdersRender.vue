<script setup lang="ts">
/**
 * Standalone Orders block — public renderer.
 *
 * A drop-on-a-page orders list for one event — the same live list (filters +
 * printer-status LEDs) as the workspace's "Bestellingen" pane, but on its own
 * page so an admin can build, e.g., a dedicated kitchen-status screen.
 *
 * Team-members-only: a signed-in team member gets the list; anyone else gets a
 * hint (the orders data comes from team-scoped admin endpoints). The event is
 * resolved — and the orders fetched — only for members, inside <Suspense>:
 * SalesBlocksEventResolver and SalesEventWorkspaceOrdersTab both top-level
 * await. clientOnly — BlockContent wraps us in <ClientOnly>.
 */
interface OrdersAttrs {
  eventSlug?: string
}

const props = defineProps<{ attrs: OrdersAttrs }>()

const { t } = useT()
const { loggedIn } = useAuth()

const eventSlug = computed(() => props.attrs.eventSlug || '')
</script>

<template>
  <div class="sales-orders-block">
    <!-- Editor didn't pick an event -->
    <div
      v-if="!eventSlug"
      class="bg-muted/80 rounded-3xl border border-dashed border-default p-6 text-center text-sm text-muted"
    >
      <UIcon name="i-lucide-receipt" class="w-6 h-6 mx-auto mb-2 text-muted" />
      {{ t('sales.block.noEventPicked') }}
    </div>

    <!-- Team-members-only tool: anonymous visitors don't see orders. -->
    <div
      v-else-if="!loggedIn"
      class="bg-muted/80 rounded-3xl border border-dashed border-default p-6 text-center text-sm text-muted"
    >
      <UIcon name="i-lucide-lock" class="w-6 h-6 mx-auto mb-2 text-muted" />
      {{ t('sales.blocks.salesOrders.ui.teamOnly') }}
    </div>

    <!-- Signed-in team member → the live orders list. -->
    <div v-else class="rounded-3xl bg-default p-6">
      <Suspense>
        <SalesBlocksEventResolver
          v-slot="{ event }"
          :event-slug="eventSlug"
          :not-found-label="t('sales.blocks.salesOrders.ui.eventNotFound')"
        >
          <SalesEventWorkspaceOrdersTab :event="event" />
        </SalesBlocksEventResolver>
        <template #fallback>
          <div class="p-6 text-center text-muted">{{ t('sales.common.loading') }}</div>
        </template>
      </Suspense>
    </div>
  </div>
</template>
