<script setup lang="ts">
// Auto-imports as `SalesPrintqueuesCard` — Crouton's <CroutonCollection> resolves
// `{PascalCollection}Card` by convention, so this is the card for the
// `salesPrintqueues` collection in any layout (list/grid).
const props = defineProps<{
  item: any
  layout?: string
  collection?: string
  stateless?: boolean
}>()

const { t } = useT()

// status is a string enum: 0=pending, 1=printing, 2=done, 9=error.
// Rendered as an LED dot — same color language as the order-row and
// printer-card LEDs (pulsing orange = busy, green = done, red = failed).
function statusMeta(status: string | number | undefined) {
  switch (String(status ?? '')) {
    case '2': return { label: t('sales.printQueue.statusDone', 'Done'), class: 'bg-success', color: 'success' as const }
    case '9': return { label: t('sales.printQueue.statusError', 'Error'), class: 'bg-error', color: 'error' as const }
    case '1': return { label: t('sales.printQueue.statusPrinting', 'Printing'), class: 'bg-warning animate-pulse', color: 'warning' as const }
    default: return { label: t('sales.printQueue.statusPending', 'Pending'), class: 'bg-warning animate-pulse', color: 'warning' as const }
  }
}

const status = computed(() => statusMeta(props.item?.status))
const orderNumber = computed(() => props.item?.orderIdData?.eventOrderNumber)
const printerName = computed(() => props.item?.printerIdData?.title)
const locationName = computed(() => props.item?.locationIdData?.title)
const retryCount = computed(() => Number(props.item?.retryCount ?? 0))
const errorMessage = computed(() => {
  if (String(props.item?.status ?? '') !== '9') return undefined
  const raw = props.item?.errorMessage
  if (!raw) return undefined
  const key = printErrorKey(raw)
  return key ? t(key, raw) : raw
})

const timeLabel = computed(() => {
  const v = props.item?.completedAt || props.item?.createdAt
  if (!v) return ''
  const d = new Date(v)
  // 24h clock — matches the printed ticket times, and "07:46 PM" reads wrong
  // on a Dutch POS.
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
})
</script>

<template>
  <!-- The row stays one calm line: name, meta, time, LED. Status detail and
       the failure reason live in the LED's hover popover — same pattern and
       styling as the printer LEDs on the order rows (OrdersTab). -->
  <div class="flex items-center gap-3 w-full">
    <UIcon name="i-lucide-printer" class="shrink-0 text-dimmed" />
    <!-- Order number only when the join is present — inside an expanded order
         it's redundant (and rendered a dangling green "#—"). -->
    <span v-if="orderNumber" class="shrink-0 font-mono font-semibold tabular-nums text-muted">
      #{{ orderNumber }}
    </span>
    <div class="min-w-0 flex-1">
      <span class="font-medium truncate block">{{ printerName || t('sales.printQueue.printer', 'Printer') }}</span>
      <p v-if="locationName || retryCount > 0" class="text-xs text-muted truncate flex items-center gap-1">
        <template v-if="locationName">
          <UIcon name="i-lucide-map-pin" class="shrink-0" />
          <span class="truncate">{{ locationName }}</span>
        </template>
        <span v-if="locationName && retryCount > 0">·</span>
        <span v-if="retryCount > 0" class="shrink-0">
          {{ t('sales.printQueue.retries', 'retries') }}: {{ retryCount }}
        </span>
      </p>
    </div>
    <span v-if="timeLabel" class="shrink-0 text-xs text-dimmed tabular-nums">{{ timeLabel }}</span>
    <!-- Row actions (e.g. OrderItems' re-print button) sit before the LED so
         the status dot is always the rightmost element, aligned across rows. -->
    <slot name="actions" />
    <UPopover mode="hover" :open-delay="150">
      <span class="block size-2.5 rounded-full shrink-0" :class="status.class" />
      <template #content>
        <div class="p-3 space-y-2 min-w-52 max-w-72">
          <p class="text-sm font-semibold flex items-center gap-1.5">
            <UIcon name="i-lucide-printer" class="shrink-0 text-muted" />
            {{ printerName || t('sales.printQueue.printer', 'Printer') }}
          </p>
          <div class="flex items-center justify-between gap-3">
            <UBadge :color="status.color" variant="subtle" size="sm">{{ status.label }}</UBadge>
            <span v-if="timeLabel" class="text-xs text-dimmed tabular-nums">{{ timeLabel }}</span>
          </div>
          <p v-if="errorMessage" class="text-xs text-error">{{ errorMessage }}</p>
        </div>
      </template>
    </UPopover>
  </div>
</template>
