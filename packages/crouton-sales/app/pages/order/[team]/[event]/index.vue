<script setup lang="ts">
/**
 * Customer-facing POS interface for an event.
 *
 * Auth: scoped helper token (cookie `pos-helper-token`).
 * Data: fetched via `/api/crouton-sales/events/[eventId]/order-data` which accepts
 *       the helper token (NOT team-member auth). Result passed to <SalesClientOrderInterface>.
 *
 * @route /order/[team]/[event]
 */
import type { SalesProduct } from '~~/layers/sales/collections/products/types'
import type { SalesCategorie } from '~~/layers/sales/collections/categories/types'

definePageMeta({ layout: false })

interface Client {
  id: string
  title: string
}

interface Location {
  id: string
  title: string
}

interface OrderData {
  event: { id: string, title: string, slug: string, teamId: string, requiresClient: boolean }
  products: SalesProduct[]
  categories: SalesCategorie[]
  clients: Client[]
  locations: Location[]
  settings: { useReusableClients: boolean }
  helper: { id: string, name: string }
}

const { t } = useT()
const route = useRoute()
const teamSlug = computed(() => route.params.team as string)
const eventSlug = computed(() => route.params.event as string)

const { isHelper, loadSession, logout, token, eventId: sessionEventId, teamId: sessionTeamId } = useHelperAuth()

const loading = ref(true)
const error = ref<string | null>(null)
const isAuthenticated = ref(false)
const orderData = ref<OrderData | null>(null)

async function loadData() {
  loading.value = true
  error.value = null

  loadSession()

  if (!isHelper.value) {
    loading.value = false
    return
  }

  try {
    const eventResponse = await $fetch<{ id: string, teamId: string }>(
      `/api/crouton-sales/events/${teamSlug.value}/by-slug/${eventSlug.value}`
    )

    if (sessionTeamId.value !== eventResponse.teamId || sessionEventId.value !== eventResponse.id) {
      loading.value = false
      return
    }

    orderData.value = await $fetch<OrderData>(
      `/api/crouton-sales/events/${eventResponse.id}/order-data`,
      { headers: { 'x-helper-token': token.value } }
    )

    isAuthenticated.value = true
  }
  catch (err: any) {
    error.value = err.data?.message || err.statusMessage || t('sales.helperLogin.loadFailed')
    console.error('Failed to load:', err)
  }
  finally {
    loading.value = false
  }
}

async function handleLogout() {
  await logout()
  await navigateTo(`/order/${teamSlug.value}/${eventSlug.value}/login`)
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <main class="h-screen flex flex-col">
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-4xl text-primary" />
    </div>

    <div v-else-if="!isAuthenticated" class="flex-1 flex items-center justify-center">
      <div class="text-center space-y-4">
        <UIcon name="i-lucide-lock" class="text-4xl text-muted" />
        <p class="text-muted">{{ t('sales.helperLogin.pleaseLogin') }}</p>
        <UButton
          :to="`/order/${teamSlug}/${eventSlug}/login`"
          icon="i-lucide-log-in"
        >
          {{ t('sales.helperLogin.login') }}
        </UButton>
      </div>
    </div>

    <div v-else-if="error" class="flex-1 flex items-center justify-center">
      <div class="text-center space-y-4">
        <UIcon name="i-lucide-alert-circle" class="text-4xl text-error" />
        <p class="text-muted">{{ error }}</p>
        <UButton @click="loadData">
          {{ t('sales.common.retry') }}
        </UButton>
      </div>
    </div>

    <template v-else-if="orderData">
      <header class="flex items-center justify-between px-4 py-3 border-b border-default">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-store" class="text-primary text-xl" />
          <h1 class="font-semibold text-lg">{{ orderData.event.title }}</h1>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-muted">{{ orderData.helper.name }}</span>
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-lucide-log-out"
            size="sm"
            @click="handleLogout"
          />
        </div>
      </header>

      <div class="flex-1 min-h-0">
        <SalesClientOrderInterface
          :event-id="orderData.event.id"
          :products="orderData.products"
          :categories="orderData.categories"
          :clients="orderData.clients"
          :locations="orderData.locations"
          :requires-client="orderData.event.requiresClient"
          :use-reusable-clients="orderData.settings.useReusableClients"
        />
      </div>
    </template>
  </main>
</template>
