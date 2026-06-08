<script setup lang="ts">
/**
 * Embedded POS interface for an event (admin shortcut).
 * Same component used at /order/[team]/[slug] for customers, but reachable
 * from the admin event workspace via "Open POS".
 *
 * @route /admin/[team]/sales/events/[slug]/orders
 */
import type { SalesEvent } from '~~/layers/sales/collections/events/types'

definePageMeta({ middleware: ['auth'] })

const { t } = useT()
const route = useRoute()
const eventSlug = computed(() => route.params.slug as string)
const { items: events } = await useCollectionQuery('salesEvents')

const event = computed(() =>
  (events.value as SalesEvent[] | null)?.find(e => e.slug === eventSlug.value)
)
</script>

<template>
  <div v-if="!event" class="flex items-center justify-center h-full">
    <div class="text-center">
      <UIcon name="i-lucide-alert-circle" class="text-4xl text-muted mb-2" />
      <p class="text-muted">{{ t('sales.events.eventNotFound') }}</p>
    </div>
  </div>
  <SalesClientOrderInterface v-else :event-id="event.id" />
</template>
