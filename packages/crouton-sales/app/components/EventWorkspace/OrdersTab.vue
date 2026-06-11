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

// Printer LEDs: one dot per active event printer on every order row (the
// dedicated Printers tab is gone — per-order print status lives here now).
const { items: printers } = await useCollectionQuery(
  'salesPrinters',
  { query: computed(() => ({ eventId: props.event.id })) }
)
const { items: printJobs, refresh: refreshPrintJobs } = await useCollectionQuery(
  'salesPrintqueues',
  { query: computed(() => ({ eventId: props.event.id })), watch: true }
)

type PrinterRow = { id: string, title: string, isActive?: boolean }
type PrintJobRow = { id: string, orderId: string, printerId: string, status?: string | number, errorMessage?: string }

const printerList = computed(() =>
  (((printers.value as PrinterRow[] | null) || []).filter(p => p.isActive !== false))
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title))
)

const jobsByOrder = computed(() => {
  const map = new Map<string, PrintJobRow[]>()
  for (const job of ((printJobs.value as PrintJobRow[] | null) || [])) {
    const list = map.get(job.orderId)
    if (list) list.push(job)
    else map.set(job.orderId, [job])
  }
  return map
})

// Jobs for one order × printer (popover detail list).
function printerJobs(orderId: string, printerId: string) {
  return (jobsByOrder.value.get(orderId) || []).filter(j => j.printerId === printerId)
}

// Per-job status meta — same enum as PrintqueuesCard: 0=pending, 1=printing,
// 2=done, 9=error.
function jobStatusMeta(status: string | number | undefined) {
  switch (String(status ?? '0')) {
    case '1': return { color: 'info' as const, label: t('sales.printQueue.statusPrinting', 'Printing') }
    case '2': return { color: 'success' as const, label: t('sales.printQueue.statusDone', 'Done') }
    case '9': return { color: 'error' as const, label: t('sales.printQueue.statusError', 'Error') }
    default: return { color: 'warning' as const, label: t('sales.printQueue.statusPending', 'Pending') }
  }
}

// LED state per order × printer. Worst status wins: red > orange > green; no
// ticket for that printer ⇒ grey.
function printerLed(orderId: string, printerId: string) {
  const statuses = printerJobs(orderId, printerId).map(j => String(j.status ?? '0'))
  if (!statuses.length) {
    return { class: 'bg-accented', label: t('sales.common.none') }
  }
  if (statuses.includes('9')) {
    return { class: 'bg-error', label: t('sales.printQueue.statusError', 'Error') }
  }
  if (statuses.some(s => s === '0' || s === '1')) {
    return { class: 'bg-warning animate-pulse', label: t('sales.printQueue.statusPrinting', 'Printing') }
  }
  return { class: 'bg-success', label: t('sales.printQueue.statusDone', 'Done') }
}

function jobTime(job: any): string {
  const v = job?.completedAt || job?.createdAt
  if (!v) return ''
  const d = new Date(v)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

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
      await Promise.all([refreshOrders(), refreshPrintJobs()])
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
          @click="() => { refreshOrders(); refreshPrintJobs() }"
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
          <!-- One LED per event printer: grey = no ticket, orange = working,
               green = printed, red = failed. Hover popover shows the jobs. -->
          <div v-if="printerList.length" class="shrink-0 flex items-center gap-1.5" @click.stop>
            <UPopover
              v-for="printer in printerList"
              :key="printer.id"
              mode="hover"
              :open-delay="150"
            >
              <span
                class="block size-2.5 rounded-full transition-colors"
                :class="printerLed(order.id, printer.id).class"
              />
              <template #content>
                <div class="p-3 space-y-2 min-w-52 max-w-72">
                  <p class="text-sm font-semibold flex items-center gap-1.5">
                    <UIcon name="i-lucide-printer" class="shrink-0 text-muted" />
                    {{ printer.title }}
                  </p>
                  <p v-if="!printerJobs(order.id, printer.id).length" class="text-xs text-muted">
                    {{ t('sales.common.none') }}
                  </p>
                  <div
                    v-for="job in printerJobs(order.id, printer.id)"
                    v-else
                    :key="job.id"
                    class="space-y-1"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <UBadge
                        :color="jobStatusMeta(job.status).color"
                        variant="subtle"
                        size="sm"
                      >
                        {{ jobStatusMeta(job.status).label }}
                      </UBadge>
                      <span v-if="jobTime(job)" class="text-xs text-dimmed tabular-nums">{{ jobTime(job) }}</span>
                    </div>
                    <p v-if="String(job.status ?? '') === '9' && job.errorMessage" class="text-xs text-error">
                      {{ job.errorMessage }}
                    </p>
                  </div>
                </div>
              </template>
            </UPopover>
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
          :print-jobs="jobsByOrder.get(order.id) || []"
        />
      </li>
    </ul>
    <div v-else class="p-12 text-center text-muted">
      <UIcon name="i-lucide-receipt" class="text-4xl mb-2" />
      <p>{{ t('sales.workspace.noOrders') }}{{ selectedHelperName ? t('sales.workspace.forThisHelper') : '' }}</p>
    </div>
  </div>
</template>
