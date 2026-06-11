<script setup lang="ts">
const props = defineProps<{
  orderId: string
  remarks?: string
  /** This order's print queue rows (passed by OrdersTab, which owns the
   * event-wide query) — rendered as a per-printer detail list. */
  printJobs?: any[]
}>()

// Requeue one failed print job — handled by OrdersTab, which owns the
// team/event context and the print-queue poll.
const emit = defineEmits<{ retryJob: [jobId: string] }>()

const { t } = useT()

const itemsQuery = computed(() => ({ orderId: props.orderId }))
const { items, pending } = await useCollectionQuery('salesOrderitems', { query: itemsQuery })

type OrderItemRow = {
  id: string
  quantity: number | string
  unitPrice: number
  totalPrice: number
  remarks?: string
  selectedOptions?: Record<string, unknown> | null
  productIdData?: { title?: string } | null
}

const rows = computed(() => (items.value as OrderItemRow[] | null) || [])

// Currency comes from OrdersTab via provide (it owns the event).
const { format: formatPrice } = useSalesCurrency()

const total = computed(() => rows.value.reduce((sum, r) => sum + (Number(r.totalPrice) || 0), 0))

// What a given print job actually printed: kitchen tickets carry the items
// routed to the job's location (product.locationId), receipt-mode jobs (or
// jobs without a location) print the whole order.
function jobItemsText(job: any): string {
  const all = rows.value
  const isWholeOrder = job?.printMode === 'receipt' || !job?.locationId
  const subset = isWholeOrder
    ? all
    : all.filter(i => (i.productIdData as any)?.locationId === job.locationId)
  return subset
    .map(i => `${i.quantity}× ${i.productIdData?.title || t('sales.orders.unknownProduct')}`)
    .join(' · ')
}

function optionsText(options?: Record<string, unknown> | null) {
  if (!options) return ''
  const entries = Object.entries(options).filter(([, v]) => v !== null && v !== undefined && v !== '')
  if (!entries.length) return ''
  return entries.map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' · ')
}
</script>

<template>
  <div class="bg-elevated/30 px-4 py-3">
    <div v-if="pending" class="py-2 text-sm text-muted">
      {{ t('sales.workspace.loadingOrders') }}
    </div>
    <div v-else-if="rows.length === 0" class="py-2 text-sm text-muted">
      {{ t('sales.orders.noItems') }}
    </div>
    <template v-else>
      <div v-if="props.remarks" class="mb-2 flex items-start gap-1.5 text-sm text-warning">
        <UIcon name="i-lucide-message-square" class="shrink-0 mt-0.5" />
        <span>{{ props.remarks }}</span>
      </div>
      <ul class="divide-y divide-default/60">
        <li v-for="item in rows" :key="item.id" class="flex items-start gap-3 py-2 text-sm">
          <span class="shrink-0 tabular-nums font-medium text-muted w-8">{{ item.quantity }}×</span>
          <div class="min-w-0 flex-1">
            <span class="font-medium">{{ item.productIdData?.title || t('sales.orders.unknownProduct') }}</span>
            <p v-if="optionsText(item.selectedOptions)" class="text-xs text-muted truncate">
              {{ optionsText(item.selectedOptions) }}
            </p>
            <p v-if="item.remarks" class="text-xs text-warning truncate">
              {{ item.remarks }}
            </p>
          </div>
          <span class="shrink-0 tabular-nums">{{ formatPrice(item.totalPrice) }}</span>
        </li>
      </ul>
      <div class="flex items-center justify-between border-t border-default mt-2 pt-2 text-sm font-semibold">
        <span>{{ t('sales.orders.total') }}</span>
        <span class="tabular-nums">{{ formatPrice(total) }}</span>
      </div>
    </template>

    <!-- Print jobs for this order (what the removed Printers tab used to list).
         The printer icons on the rows make a section label redundant. -->
    <div v-if="printJobs?.length" class="mt-3 pt-3 border-t border-default/60">
      <ul class="divide-y divide-default/60">
        <li v-for="job in printJobs" :key="job.id" class="py-2">
          <div class="flex items-center gap-2">
            <SalesPrintqueuesCard :item="job" stateless class="flex-1 min-w-0" />
            <UButton
              v-if="String(job.status ?? '') === '9'"
              size="xs"
              color="warning"
              variant="soft"
              icon="i-lucide-rotate-ccw"
              class="shrink-0"
              @click="emit('retryJob', job.id)"
            >
              {{ t('sales.orders.rePrint') }}
            </UButton>
          </div>
          <p v-if="jobItemsText(job)" class="text-xs text-muted mt-1 ps-7">
            {{ jobItemsText(job) }}
          </p>
        </li>
      </ul>
    </div>
  </div>
</template>
