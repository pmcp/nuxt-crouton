<script setup lang="ts">
/**
 * Clients panel ("show clients"): slideover listing the event's active
 * clients with their open tab (order count + total), searchable. "Print
 * receipt" settles the tab — it queues one aggregated end-of-tab receipt
 * and deactivates the client, removing them from the POS picker. Only
 * meaningful for events in recurring-clients mode (`requiresClient`).
 */
import type { SalesEvent } from '~~/layers/sales/collections/events/types'

const props = defineProps<{
  event: SalesEvent
}>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useT()
const toast = useToast()
const { format: formatPrice } = useSalesCurrency(() => props.event.currency)

interface ClientTabSummary {
  id: string
  title: string
  orderCount: number
  total: number
}

const search = ref('')
const clients = ref<ClientTabSummary[]>([])
const pending = ref(false)
// Two-step print: first click arms the row, second click confirms.
const armedId = ref<string | null>(null)
const printingId = ref<string | null>(null)

const apiBase = computed(() =>
  `/api/crouton-sales/teams/${props.event.teamId}/events/${props.event.id}/clients`
)

async function refresh() {
  pending.value = true
  try {
    const res = await $fetch<{ clients: ClientTabSummary[] }>(`${apiBase.value}/summary`)
    clients.value = res.clients
  }
  catch (error) {
    console.error('Failed to load client tabs:', error)
    toast.add({
      title: t('sales.workspace.clientsPanel.loadError'),
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
  finally {
    pending.value = false
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    search.value = ''
    armedId.value = null
    refresh()
  }
})

const filteredClients = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return clients.value
  return clients.value.filter(c => c.title.toLowerCase().includes(query))
})

async function printEndReceipt(client: ClientTabSummary) {
  if (armedId.value !== client.id) {
    armedId.value = client.id
    return
  }

  printingId.value = client.id
  try {
    await $fetch(`${apiBase.value}/${client.id}/end-receipt`, { method: 'POST' })
    clients.value = clients.value.filter(c => c.id !== client.id)
    toast.add({
      title: t('sales.workspace.clientsPanel.printed', { client: client.title }),
      color: 'success',
      icon: 'i-lucide-printer'
    })
  }
  catch (error) {
    console.error('Failed to print end receipt:', error)
    toast.add({
      title: t('sales.workspace.clientsPanel.printError'),
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
  finally {
    printingId.value = null
    armedId.value = null
  }
}
</script>

<template>
  <USlideover v-model:open="open">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-users" class="size-5" />
        <span>{{ t('sales.workspace.clientsPanel.title') }}</span>
      </div>
    </template>

    <template #body>
      <div class="space-y-3">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          :placeholder="t('sales.workspace.clientsPanel.searchPlaceholder')"
          class="w-full"
        />

        <div v-if="pending" class="p-6 text-center text-muted">
          {{ t('sales.common.loading') }}
        </div>

        <div v-else-if="filteredClients.length === 0" class="p-6 text-center text-muted text-sm">
          {{ search ? t('sales.workspace.clientsPanel.noMatches') : t('sales.workspace.clientsPanel.empty') }}
        </div>

        <ul v-else class="divide-y divide-default border border-default rounded-lg overflow-hidden">
          <li
            v-for="client in filteredClients"
            :key="client.id"
            class="flex items-center gap-3 px-3 py-2.5 bg-default hover:bg-elevated/50 transition-colors"
          >
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ client.title }}</p>
              <p class="text-xs text-muted">
                {{ t('sales.workspace.clientsPanel.orderCount', { count: client.orderCount }) }}
                · {{ formatPrice(client.total) }}
              </p>
            </div>
            <UButton
              size="xs"
              icon="i-lucide-printer"
              :color="armedId === client.id ? 'warning' : 'neutral'"
              :variant="armedId === client.id ? 'solid' : 'soft'"
              :loading="printingId === client.id"
              @click="printEndReceipt(client)"
            >
              {{ armedId === client.id
                ? t('sales.workspace.clientsPanel.confirmPrint')
                : t('sales.workspace.clientsPanel.printReceipt') }}
            </UButton>
          </li>
        </ul>

        <p class="text-xs text-muted">
          {{ t('sales.workspace.clientsPanel.hint') }}
        </p>
      </div>
    </template>
  </USlideover>
</template>
