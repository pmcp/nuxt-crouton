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

// status is a string enum: 0=pending, 1=printing, 2=done, 9=error
function statusMeta(status: string | number | undefined) {
  switch (String(status ?? '')) {
    case '1': return { label: t('sales.printQueue.statusPrinting', 'Printing'), color: 'info' as const }
    case '2': return { label: t('sales.printQueue.statusDone', 'Done'), color: 'success' as const }
    case '9': return { label: t('sales.printQueue.statusError', 'Error'), color: 'error' as const }
    default: return { label: t('sales.printQueue.statusPending', 'Pending'), color: 'warning' as const }
  }
}

const status = computed(() => statusMeta(props.item?.status))
const orderNumber = computed(() => props.item?.orderIdData?.eventOrderNumber)
const printerName = computed(() => props.item?.printerIdData?.title)
const locationName = computed(() => props.item?.locationIdData?.title)
const retryCount = computed(() => Number(props.item?.retryCount ?? 0))
const errorMessage = computed(() =>
  String(props.item?.status ?? '') === '9' ? props.item?.errorMessage : undefined
)

const timeLabel = computed(() => {
  const v = props.item?.completedAt || props.item?.createdAt
  if (!v) return ''
  const d = new Date(v)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})
</script>

<template>
  <div class="flex items-center gap-3 w-full">
    <UIcon name="i-lucide-printer" class="shrink-0 text-dimmed" />
    <span class="shrink-0 font-mono font-semibold tabular-nums text-primary">
      #{{ orderNumber ?? '—' }}
    </span>
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <span class="font-medium truncate">{{ printerName || t('sales.printQueue.printer', 'Printer') }}</span>
        <UBadge v-if="retryCount > 0" color="neutral" variant="subtle" size="sm">
          {{ t('sales.printQueue.retries', 'retries') }}: {{ retryCount }}
        </UBadge>
      </div>
      <p v-if="locationName" class="text-xs text-muted truncate flex items-center gap-1">
        <UIcon name="i-lucide-map-pin" class="shrink-0" />
        {{ locationName }}
      </p>
      <p
        v-if="errorMessage"
        class="text-xs text-error truncate flex items-center gap-1"
        :title="errorMessage"
      >
        <UIcon name="i-lucide-triangle-alert" class="shrink-0" />
        {{ errorMessage }}
      </p>
    </div>
    <span v-if="timeLabel" class="shrink-0 text-xs text-dimmed tabular-nums">{{ timeLabel }}</span>
    <UBadge :color="status.color" variant="subtle" size="sm" class="shrink-0">
      {{ status.label }}
    </UBadge>
  </div>
</template>
