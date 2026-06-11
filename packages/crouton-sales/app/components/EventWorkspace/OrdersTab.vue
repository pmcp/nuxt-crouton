<script setup lang="ts">
import type { SalesEvent } from '~~/layers/sales/collections/events/types'

const props = defineProps<{ event: SalesEvent }>()

// Share the event currency with the expandable OrderItems panels.
provideSalesCurrency(() => props.event.currency)

const { t } = useT()
const { open } = useCrouton()
const route = useRoute()
const teamParam = computed(() => route.params.team as string)

interface ActiveHelper {
  id: string
  displayName: string
  role: string
  expiresAt: string
  lastActiveAt: string | null
}

const { data: activeHelpers } = await useFetch<ActiveHelper[]>(
  () => `/api/crouton-sales/teams/${teamParam.value}/events/${props.event.id}/active-helpers`,
  { default: () => [] }
)

const selectedHelperName = ref<string | null>(null)
const autoRefreshOrders = ref(false)

const ordersQuery = computed(() => {
  const q: Record<string, string> = { eventId: props.event.id }
  if (selectedHelperName.value) q.owner = selectedHelperName.value
  return q
})

const { items: orders, pending: ordersPending, refresh: refreshOrders } = await useCollectionQuery(
  'salesOrders',
  { query: ordersQuery, watch: true }
)

const helperOptions = computed(() => [
  { id: null, label: t('sales.workspace.allHelpers') },
  ...((activeHelpers.value as ActiveHelper[] | null) || []).map(h => ({
    id: h.displayName,
    label: h.displayName
  }))
])

const ordersRefreshing = ref(false)
let refreshInterval: ReturnType<typeof setInterval> | null = null

watch(autoRefreshOrders, (enabled) => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
  if (enabled) {
    refreshInterval = setInterval(async () => {
      ordersRefreshing.value = true
      await refreshOrders()
      ordersRefreshing.value = false
    }, 10000)
  }
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})

type OrderRow = {
  id: string
  eventOrderNumber?: number
  clientName?: string
  overallRemarks?: string
  isPersonnel?: boolean
  status: string
  owner?: string
}

const orderRows = computed(() => (orders.value as OrderRow[] | null) || [])

const expandedIds = ref<Set<string>>(new Set())

function toggleExpand(id: string) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

function statusColor(status: string) {
  switch (status) {
    case 'pending': return 'warning'
    case 'processing': return 'info'
    case 'completed': return 'success'
    case 'cancelled': return 'error'
    case 'failed': return 'error'
    case 'print_failed': return 'error'
    default: return 'neutral'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending': return t('sales.orders.pending', 'Pending')
    case 'processing': return t('sales.orders.processing', 'Processing')
    case 'completed': return t('sales.orders.completed', 'Completed')
    case 'cancelled': return t('sales.orders.cancelled', 'Cancelled')
    case 'print_failed': return t('sales.orders.printFailed', 'Print failed')
    default: return status
  }
}

function openEditOrder(id: string) {
  open('update', 'salesOrders', [id], 'slideover')
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <USelectMenu
          v-model="selectedHelperName"
          :items="helperOptions"
          value-key="id"
          :placeholder="t('sales.workspace.allHelpers')"
          icon="i-lucide-user"
          size="sm"
          class="w-48"
          :searchable="true"
        />
        <USwitch
          v-model="autoRefreshOrders"
          :label="t('sales.orders.autoRefresh')"
          size="sm"
        />
      </div>
      <div class="flex items-center gap-2 text-sm text-muted">
        <span>{{ (orders as any[])?.length || 0 }} {{ t('sales.workspace.ordersLabel') }}</span>
        <UButton
          variant="ghost"
          size="xs"
          icon="i-lucide-refresh-cw"
          :loading="ordersRefreshing"
          @click="refreshOrders"
        />
      </div>
    </div>
    <div v-if="ordersPending" class="p-6 text-center text-muted">
      {{ t('sales.workspace.loadingOrders') }}
    </div>
    <ul
      v-else-if="orderRows.length > 0"
      role="list"
      class="divide-y divide-default rounded-lg border border-default overflow-hidden"
    >
      <li
        v-for="order in orderRows"
        :key="order.id"
        class="bg-default"
      >
        <div
          class="group flex items-center gap-3 px-3 py-2.5 hover:bg-elevated/50 transition-colors cursor-pointer"
          @click="toggleExpand(order.id)"
        >
          <UIcon
            name="i-lucide-chevron-right"
            class="shrink-0 text-dimmed transition-transform"
            :class="expandedIds.has(order.id) ? 'rotate-90' : ''"
          />
          <span class="shrink-0 font-mono font-semibold tabular-nums text-primary">
            #{{ order.eventOrderNumber ?? '—' }}
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="font-medium truncate">{{ order.clientName || t('sales.orders.client') }}</span>
              <UBadge v-if="order.isPersonnel" color="warning" variant="subtle" size="xs">
                {{ t('sales.orders.staff') }}
              </UBadge>
            </div>
            <p v-if="order.owner" class="text-xs text-muted truncate flex items-center gap-1">
              <UIcon name="i-lucide-user" class="shrink-0" />
              {{ order.owner }}
            </p>
          </div>
          <UBadge :color="statusColor(order.status)" variant="subtle" size="sm" class="shrink-0">
            {{ statusLabel(order.status) }}
          </UBadge>
          <UButton
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="xs"
            class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            @click.stop="openEditOrder(order.id)"
          />
        </div>
        <SalesEventWorkspaceOrderItems
          v-if="expandedIds.has(order.id)"
          :order-id="order.id"
          :remarks="order.overallRemarks"
        />
      </li>
    </ul>
    <div v-else class="p-12 text-center text-muted">
      <UIcon name="i-lucide-receipt" class="text-4xl mb-2" />
      <p>{{ t('sales.workspace.noOrders') }}{{ selectedHelperName ? t('sales.workspace.forThisHelper') : '' }}</p>
    </div>
  </div>
</template>
