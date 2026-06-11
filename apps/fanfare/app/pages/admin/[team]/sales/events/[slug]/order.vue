<script setup lang="ts">
/**
 * Admin POS page
 *
 * Full ordering interface for one event inside the admin (Kassa tab).
 * Same flow as the orderInterfaceBlock CMS block: helper PIN login,
 * then <SalesClientOrderInterface>. Helper sessions live in localStorage,
 * so all data loading happens client-side (onMounted).
 *
 * @route /admin/[team]/sales/events/[slug]/order
 */
import type { SalesProduct } from '~~/layers/sales/collections/products/types'
import type { SalesCategory } from '~~/layers/sales/collections/categories/types'

definePageMeta({ middleware: ['auth'] })

const { t } = useT()
const route = useRoute()

const teamSlug = computed(() => String(route.params.team || ''))
const eventSlug = computed(() => String(route.params.slug || ''))
const workspacePath = computed(() => `/admin/${teamSlug.value}/sales/events/${eventSlug.value}`)

interface PublicEvent {
  id: string
  teamId: string
  title: string
  slug: string
  status?: string
}

interface OrderData {
  event: { id: string, title: string, slug: string, teamId: string, requiresClient: boolean, currency?: string }
  products: SalesProduct[]
  categories: SalesCategory[]
  clients: { id: string, title: string }[]
  locations: { id: string, title: string }[]
  settings: { useReusableClients: boolean }
  helper: { id: string, name: string }
}

const {
  isHelper,
  loadSession,
  logout,
  token,
  eventId: sessionEventId,
  teamId: sessionTeamId,
  login
} = useHelperAuth()

const publicEvent = ref<PublicEvent | null>(null)
const lookupError = ref<string | null>(null)
const orderData = ref<OrderData | null>(null)
const loadError = ref<string | null>(null)
const initialLoading = ref(true)

const formState = reactive({ helperName: '', pin: '' })
const loginError = ref('')
const submitting = ref(false)

async function loadEvent() {
  try {
    publicEvent.value = await $fetch<PublicEvent>(
      `/api/crouton-sales/events/${teamSlug.value}/by-slug/${eventSlug.value}`
    )
  }
  catch (err: any) {
    lookupError.value = err?.data?.message || err?.statusMessage || t('sales.helperLogin.eventNotFound')
  }
}

async function loadOrderData() {
  if (!publicEvent.value) return
  // Helper session must match this event AND team — guards against a stale
  // session from a different event.
  if (sessionTeamId.value !== publicEvent.value.teamId || sessionEventId.value !== publicEvent.value.id) {
    return
  }
  loadError.value = null
  try {
    orderData.value = await $fetch<OrderData>(
      `/api/crouton-sales/events/${publicEvent.value.id}/order-data`,
      { headers: { 'x-helper-token': token.value } }
    )
  }
  catch (err: any) {
    loadError.value = err?.data?.message || err?.statusMessage || t('sales.helperLogin.loadDataError')
  }
}

async function onLoginSubmit() {
  if (!publicEvent.value) return
  if (!formState.helperName.trim()) {
    loginError.value = t('sales.helperLogin.enterNameError')
    return
  }
  if (!formState.pin.trim()) {
    loginError.value = t('sales.helperLogin.enterPinError')
    return
  }
  loginError.value = ''
  submitting.value = true
  const success = await login({
    teamId: publicEvent.value.teamId,
    eventId: publicEvent.value.id,
    pin: formState.pin,
    helperName: formState.helperName.trim()
  })
  submitting.value = false
  if (success) {
    await loadOrderData()
  }
  else {
    loginError.value = t('sales.helperLogin.failed')
  }
}

async function handleLogout() {
  await logout()
  orderData.value = null
}

onMounted(async () => {
  loadSession()
  await loadEvent()
  if (isHelper.value) await loadOrderData()
  initialLoading.value = false
})
</script>

<template>
  <div class="p-6 space-y-4">
    <div class="flex items-center gap-2">
      <UButton
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        size="sm"
        :label="t('sales.events.workspace')"
        :to="workspacePath"
      />
    </div>

    <!-- Event lookup failed -->
    <UAlert
      v-if="lookupError"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      :title="lookupError"
    />

    <!-- Initial lookup pending -->
    <div
      v-else-if="initialLoading"
      class="bg-muted/50 rounded-xl border border-default p-12 text-center"
    >
      <UIcon name="i-lucide-loader-2" class="w-6 h-6 mx-auto animate-spin text-muted" />
    </div>

    <!-- Authenticated + data loaded → full POS -->
    <div
      v-else-if="orderData"
      class="rounded-xl border border-default overflow-clip bg-default flex flex-col h-[calc(100dvh-12rem)]"
    >
      <header class="flex items-start gap-3 px-4 py-3 border-b border-default shrink-0">
        <UIcon name="i-lucide-store" class="text-primary text-xl mt-0.5 shrink-0" />
        <div class="flex-1 min-w-0">
          <h2 class="font-semibold text-lg leading-tight truncate">{{ orderData.event.title }}</h2>
          <div class="flex items-center gap-2 mt-1 text-sm text-muted">
            <span>{{ t('sales.helperLogin.loggedInAs') }} <span class="text-default font-medium">{{ orderData.helper.name }}</span></span>
            <span aria-hidden="true">·</span>
            <UButton
              variant="link"
              color="primary"
              size="sm"
              class="p-0"
              :label="t('sales.helperLogin.logout')"
              @click.stop="handleLogout"
            />
          </div>
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
          :currency="orderData.event.currency"
        />
      </div>
    </div>

    <!-- order-data fetch failed (helper auth ok, but server errored) -->
    <UAlert
      v-else-if="loadError && isHelper"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      :title="loadError"
      :actions="[{ label: t('sales.common.retry'), color: 'error', variant: 'soft', onClick: loadOrderData }]"
    />

    <!-- Not logged in: inline helper login form -->
    <div
      v-else-if="publicEvent"
      class="bg-default rounded-xl border border-default p-6"
    >
      <div class="max-w-sm mx-auto space-y-5">
        <div class="text-center">
          <UIcon name="i-lucide-store" class="text-3xl text-primary mb-2" />
          <h2 class="text-lg font-semibold">{{ publicEvent.title }}</h2>
          <p class="text-sm text-muted mt-1">{{ t('sales.helperLogin.required') }}</p>
        </div>
        <UForm :state="formState" class="space-y-3" @submit="onLoginSubmit">
          <UFormField :label="t('sales.helperLogin.yourName')" name="helperName">
            <UInput
              v-model="formState.helperName"
              :placeholder="t('sales.helperLogin.enterName')"
              size="lg"
              class="w-full"
              autocomplete="name"
            />
          </UFormField>
          <UFormField :label="t('sales.helperLogin.pin')" name="pin">
            <UInput
              v-model="formState.pin"
              type="password"
              :placeholder="t('sales.helperLogin.enterPin')"
              size="lg"
              class="w-full"
              :ui="{ base: 'font-mono text-center tracking-widest' }"
              inputmode="numeric"
              pattern="[0-9]*"
            />
          </UFormField>
          <UButton
            type="submit"
            :loading="submitting"
            block
            size="lg"
            icon="i-lucide-log-in"
          >
            {{ t('sales.helperLogin.login') }}
          </UButton>
        </UForm>
        <UAlert
          v-if="loginError"
          color="error"
          variant="soft"
          icon="i-lucide-alert-circle"
          :title="loginError"
        />
      </div>
    </div>
  </div>
</template>
