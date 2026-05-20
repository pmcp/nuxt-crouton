<script setup lang="ts">
import type { SalesEvent } from '~~/layers/sales/collections/events/types'

const props = defineProps<{ event: SalesEvent }>()

const { open } = useCrouton()
const route = useRoute()
const teamParam = computed(() => route.params.team as string)

const eventQuery = computed(() => ({ eventId: props.event.id }))
const { items: printers, pending: printersPending } = await useCollectionQuery('salesPrinters', { query: eventQuery })

function openCreatePrinter() {
  open('create', 'salesPrinters', [], 'slideover', { eventId: props.event.id })
}

const showPrinterPreview = ref(false)
// `any` here because CroutonCollection's #card-actions slot provides Row<any>
// and we just forward the row.original to the modal.
const selectedPrinter = ref<any>(null)

function openPrinterPreview(printer: any) {
  selectedPrinter.value = printer
  showPrinterPreview.value = true
}

// Load receipt settings for preview modal
interface ReceiptSettings {
  items_section_title: string
  special_instructions_title: string
  complete_order_header: string
  staff_order_header: string
  footer_text: string
  test_title: string
  test_success_message: string
}

const receiptSettings = ref<ReceiptSettings>({
  items_section_title: 'ITEMS:',
  special_instructions_title: 'SPECIAL INSTRUCTIONS:',
  complete_order_header: '*** COMPLETE ORDER ***',
  staff_order_header: '*** STAFF ORDER ***',
  footer_text: 'Thank you for your order!',
  test_title: 'PRINTER TEST',
  test_success_message: 'Test completed successfully!'
})

onMounted(async () => {
  try {
    const data = await $fetch<ReceiptSettings>(
      `/api/crouton-sales/teams/${teamParam.value}/events/${props.event.id}/receipt-settings`
    )
    receiptSettings.value = data
  }
  catch (err) {
    console.error('Error loading receipt settings:', err)
  }
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-end">
      <UButton color="primary" size="sm" icon="i-lucide-plus" @click="openCreatePrinter">
        Add Printer
      </UButton>
    </div>
    <div v-if="printersPending" class="p-6 text-center text-muted">
      Loading printers...
    </div>
    <CroutonCollection
      v-else-if="printers && (printers as any[]).length > 0"
      layout="grid"
      collection="salesPrinters"
      :rows="printers"
    >
      <template #card-actions="{ row }">
        <UButton
          variant="ghost"
          size="xs"
          icon="i-lucide-eye"
          @click.stop="openPrinterPreview(row)"
        >
          Preview
        </UButton>
      </template>
    </CroutonCollection>
    <div v-else class="p-12 text-center text-muted">
      <UIcon name="i-lucide-printer" class="text-4xl mb-2" />
      <p>No printers configured</p>
      <UButton size="sm" variant="outline" class="mt-3" @click="openCreatePrinter">
        Add Printer
      </UButton>
    </div>

    <SalesSettingsPrintPreviewModal
      v-model="showPrinterPreview"
      :printer="selectedPrinter"
      :test-print-api-base="`/api/teams/${teamParam}/sales-printers`"
      :receipt-settings="receiptSettings"
    />
  </div>
</template>
