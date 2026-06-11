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

const ordersQuery = computed(() => {
  const q: Record<string, string> = { eventId: props.event.id }
  if (selectedHelperName.value) q.owner = selectedHelperName.value
  return q
})

// Server pagination: events run into hundreds of orders, and this view polls
// every 2s — fetch only the newest page (server orders by createdAt desc).
const {
  items: orders,
  pending: ordersPending,
  refresh: refreshOrders,
  page: ordersPage,
  total: ordersTotal,
  pageCount: ordersPageCount
} = await useCollectionQuery(
  'salesOrders',
  { query: ordersQuery, watch: true, pagination: { pageSize: 25 } }
)

// Filter change ⇒ back to page 1 (the old page may not exist in the new set).
watch(selectedHelperName, () => {
  ordersPage.value = 1
})

// Printer LEDs: one dot per active event printer on every order row (the
// dedicated Printers tab is gone — per-order print status lives here now).
const { items: printers } = await useCollectionQuery(
  'salesPrinters',
  { query: computed(() => ({ eventId: props.event.id })) }
)
type PrinterRow = { id: string, title: string, isActive?: boolean }
type PrintJobRow = {
  id: string
  orderId: string
  printerId: string
  status?: string | number
  errorMessage?: string
  retryCount?: number
  createdAt?: string | number
  completedAt?: string | number
}

// Slim status endpoint instead of the generated collection GET: that one
// returns each job's full base64 printData, which is far too heavy for the
// register's 2s poll. This payload is ~50 bytes per job.
const { data: printJobs, refresh: refreshPrintJobs } = await useFetch<PrintJobRow[]>(
  () => `/api/crouton-sales/teams/${teamParam.value}/events/${props.event.id}/printqueues/status`,
  { default: () => [] }
)

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

// Spooler error messages are stored in English; translate the known set.
function jobError(job: PrintJobRow): string {
  const raw = job.errorMessage || ''
  const key = printErrorKey(raw)
  return key ? t(key, raw) : raw
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

// Register overview: always live, no toggle. Poll every 5s while the screen
// is visible — orders arrive from other helpers' devices, so the view must
// keep refreshing even when this register is idle. Pause while the browser
// tab is hidden and catch up the moment it becomes visible again.
function refreshAll() {
  refreshOrders()
  refreshPrintJobs()
}

let refreshInterval: ReturnType<typeof setInterval> | null = null

function onVisibilityChange() {
  if (document.visibilityState === 'visible') refreshAll()
}

onMounted(() => {
  refreshInterval = setInterval(() => {
    if (document.visibilityState === 'hidden') return
    refreshAll()
  }, 2000)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

async function manualRefresh() {
  ordersRefreshing.value = true
  await Promise.all([refreshOrders(), refreshPrintJobs()])
  ordersRefreshing.value = false
}

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
      </div>
      <div class="flex items-center gap-2 text-sm text-muted">
        <span>{{ ordersTotal }} {{ t('sales.workspace.ordersLabel') }}</span>
        <UButton
          variant="ghost"
          size="xs"
          icon="i-lucide-refresh-cw"
          :loading="ordersRefreshing"
          @click="manualRefresh"
        />
      </div>
    </div>
    <!-- Loading state only before first data — the 5s poll flips `pending`
         on every refresh and would otherwise flicker the whole list. -->
    <div v-if="ordersPending && orderRows.length === 0" class="p-6 text-center text-muted">
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
          class="group relative overflow-hidden hover:bg-elevated/50 transition-colors cursor-pointer"
          @click="toggleExpand(order.id)"
        >
          <!-- Expand chevron slides in from the left edge (stays out while
               the row is expanded), pushing the content inward — same
               affordance pattern as the POS product cards. -->
          <div
            class="absolute left-0 top-0 bottom-0 z-10 flex items-center ps-3
                   transition-transform duration-200 ease-out"
            :class="expandedIds.has(order.id) ? 'translate-x-0' : '-translate-x-full group-hover:translate-x-0 pointer-coarse:translate-x-0'"
          >
            <UIcon
              name="i-lucide-chevron-right"
              class="shrink-0 text-dimmed transition-transform"
              :class="expandedIds.has(order.id) ? 'rotate-90' : ''"
            />
          </div>

          <!-- Edit strip slides in from the right (full height, bookings-card
               style), pushing the LEDs inward -->
          <button
            type="button"
            class="absolute right-0 top-0 bottom-0 z-10 flex items-center justify-center px-2.5
                   bg-elevated/95 hover:bg-elevated text-muted hover:text-highlighted cursor-pointer
                   transition-all duration-200 ease-out translate-x-full group-hover:translate-x-0
                   pointer-coarse:translate-x-0"
            :aria-label="t('common.edit')"
            @click.stop="openEditOrder(order.id)"
          >
            <UIcon name="i-lucide-pencil" class="size-4" />
          </button>

          <div
            class="flex items-center gap-3 px-3 py-2.5 transition-[padding] duration-200 ease-out group-hover:pe-14 pointer-coarse:pe-14"
            :class="expandedIds.has(order.id) ? 'ps-9' : 'group-hover:ps-9 pointer-coarse:ps-9'"
          >
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
                      {{ jobError(job) }}
                    </p>
                  </div>
                </div>
              </template>
            </UPopover>
          </div>
          </div>
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
    <!-- Older orders: newest page is the register's working set; history on demand -->
    <div v-if="ordersPageCount > 1" class="flex items-center justify-center gap-3 pt-1">
      <UButton
        variant="ghost"
        size="xs"
        icon="i-lucide-chevron-left"
        :disabled="ordersPage <= 1"
        @click="ordersPage--"
      />
      <span class="text-xs text-muted tabular-nums">{{ ordersPage }} / {{ ordersPageCount }}</span>
      <UButton
        variant="ghost"
        size="xs"
        icon="i-lucide-chevron-right"
        :disabled="ordersPage >= ordersPageCount"
        @click="ordersPage++"
      />
    </div>
  </div>
</template>
