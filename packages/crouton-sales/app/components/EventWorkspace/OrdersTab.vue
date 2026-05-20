<script setup lang="ts">
import type { SalesEvent } from '~~/layers/sales/collections/events/types'

const props = defineProps<{ event: SalesEvent }>()

const route = useRoute()
const teamParam = computed(() => route.params.team as string)
const { columns: ordersColumns } = useSalesOrders()

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
  { id: null, label: 'All Helpers' },
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
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <USelectMenu
          v-model="selectedHelperName"
          :items="helperOptions"
          value-key="id"
          placeholder="All Helpers"
          icon="i-lucide-user"
          size="sm"
          class="w-48"
          :searchable="true"
        />
        <USwitch
          v-model="autoRefreshOrders"
          label="Auto-refresh"
          size="sm"
        />
      </div>
      <div class="flex items-center gap-2 text-sm text-muted">
        <span>{{ (orders as any[])?.length || 0 }} orders</span>
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
      Loading orders...
    </div>
    <CroutonCollection
      v-else-if="orders && (orders as any[]).length > 0"
      layout="table"
      collection="salesOrders"
      :rows="orders"
      :columns="ordersColumns"
      :hide-default-columns="{ createdAt: true, updatedAt: true, createdBy: true, updatedBy: true }"
    />
    <div v-else class="p-12 text-center text-muted">
      <UIcon name="i-lucide-receipt" class="text-4xl mb-2" />
      <p>No orders yet{{ selectedHelperName ? ' for this helper' : '' }}</p>
    </div>
  </div>
</template>
