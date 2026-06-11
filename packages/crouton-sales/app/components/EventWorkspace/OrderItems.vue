<script setup lang="ts">
const props = defineProps<{
  orderId: string
  remarks?: string
  /** This order's print queue rows (passed by OrdersTab, which owns the
   * event-wide query) — rendered as a per-printer detail list. */
  printJobs?: any[]
}>()

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

    <!-- Print jobs for this order (what the removed Printers tab used to list) -->
    <div v-if="printJobs?.length" class="mt-3 pt-3 border-t border-default/60">
      <p class="text-xs font-semibold text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <UIcon name="i-lucide-printer" class="shrink-0" />
        {{ t('sales.sidebar.printers') }}
      </p>
      <ul class="divide-y divide-default/60">
        <li v-for="job in printJobs" :key="job.id" class="py-2">
          <SalesPrintqueuesCard :item="job" stateless />
        </li>
      </ul>
    </div>
  </div>
</template>
