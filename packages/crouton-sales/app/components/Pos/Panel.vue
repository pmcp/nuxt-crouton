<script setup lang="ts">
/**
 * Self-contained POS panel
 *
 * One component owning the whole POS auth + data flow, reusable in the admin
 * order page, the workspace kassa aside, and (potentially) the CMS block:
 *
 *   team-member session  →  admin token issued automatically (no PIN form)
 *   helper (anonymous)   →  inline PIN + name login form
 *   authenticated        →  <SalesClientOrderInterface> (editable for admins)
 *
 * Helper sessions live in localStorage/cookie, so everything loads client-side
 * (onMounted); SSR renders the loading state. Pre-fetched order-data is
 * re-fetched whenever a crouton mutation touches the sales catalog, so
 * products/categories created from the editable POS show up immediately.
 */
import type { SalesProduct, SalesCategory } from '../../types'

const props = withDefaults(defineProps<{
  /** Slug of the event to open the POS for. */
  eventSlug: string
  /** Team route param (slug or id). Defaults to `route.params.team`. */
  teamParam?: string
  /** Allow admin editing affordances (only applies to team-member sessions). */
  editable?: boolean
  /** Show the event title / logged-in-as header row. */
  showHeader?: boolean
}>(), {
  editable: true,
  showHeader: true
})

const { t } = useT()
const route = useRoute()
const { loggedIn } = useAuth()

const teamParam = computed(() => props.teamParam || String(route.params.team || ''))

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
  login,
  loginAsAdmin
} = useHelperAuth()

const publicEvent = ref<PublicEvent | null>(null)
const lookupError = ref<string | null>(null)
const orderData = ref<OrderData | null>(null)
const loadError = ref<string | null>(null)
const initialLoading = ref(true)

// Editing is only offered to real team sessions — the crouton create forms
// post to team-scoped endpoints a helper token can't reach.
const editable = computed(() => props.editable && loggedIn.value)

const sessionMatchesEvent = computed(() =>
  !!publicEvent.value
  && isHelper.value
  && sessionTeamId.value === publicEvent.value.teamId
  && sessionEventId.value === publicEvent.value.id
)

// Login form state (helper PIN fallback)
const formState = reactive({ helperName: '', pin: '' })
const loginError = ref('')
const submitting = ref(false)

async function loadEvent() {
  try {
    publicEvent.value = await $fetch<PublicEvent>(
      `/api/crouton-sales/events/${teamParam.value}/by-slug/${props.eventSlug}`
    )
  }
  catch (err: any) {
    lookupError.value = err?.data?.message || err?.statusMessage || t('sales.helperLogin.eventNotFound')
  }
}

async function loadOrderData() {
  if (!publicEvent.value || !sessionMatchesEvent.value) return
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
  if (publicEvent.value) {
    // Team members skip the PIN: mint an admin helper token when there's no
    // (matching) helper session yet. Falls through to the PIN form on failure
    // (e.g. the session user isn't a member of this team).
    if (!sessionMatchesEvent.value && loggedIn.value) {
      await loginAsAdmin({ teamId: publicEvent.value.teamId, eventId: publicEvent.value.id })
    }
    await loadOrderData()
  }
  initialLoading.value = false
})

// Products/categories/locations created or edited from the POS (or anywhere
// else while it's open) must show up without a reload — order-data is a
// plain pre-fetched payload, so re-fetch it on relevant mutations.
const CATALOG_COLLECTIONS = ['salesProducts', 'salesCategories', 'salesLocations']
const unhookMutation = useNuxtApp().hook('crouton:mutation', (payload: any) => {
  if (orderData.value && CATALOG_COLLECTIONS.includes(payload.collection)) {
    loadOrderData()
  }
})
onUnmounted(unhookMutation)
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Event lookup failed -->
    <UAlert
      v-if="lookupError"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      :title="lookupError"
    />

    <!-- Initial lookup / auto-login pending -->
    <div
      v-else-if="initialLoading"
      class="flex-1 flex items-center justify-center p-12"
    >
      <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-muted" />
    </div>

    <!-- Authenticated + data loaded → full POS -->
    <template v-else-if="orderData">
      <header
        v-if="showHeader"
        class="flex items-start gap-3 px-4 py-3 border-b border-default shrink-0"
      >
        <UIcon name="i-lucide-store" class="text-primary text-xl mt-0.5 shrink-0" />
        <div class="flex-1 min-w-0">
          <h2 class="font-semibold text-lg leading-tight truncate">{{ orderData.event.title }}</h2>
          <div class="flex items-center gap-2 mt-1 text-sm text-muted">
            <span>{{ t('sales.helperLogin.loggedInAs') }} <span class="text-default font-medium">{{ orderData.helper.name }}</span></span>
            <!-- Logging out is only meaningful for PIN sessions — an admin
                 session would just re-mint a token on the next mount. -->
            <template v-if="!loggedIn">
              <span aria-hidden="true">·</span>
              <UButton
                variant="link"
                color="primary"
                size="sm"
                class="p-0"
                :label="t('sales.helperLogin.logout')"
                @click.stop="handleLogout"
              />
            </template>
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
          :editable="editable"
        />
      </div>
    </template>

    <!-- order-data fetch failed (auth ok, but server errored) -->
    <UAlert
      v-else-if="loadError && isHelper"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      :title="loadError"
      :actions="[{ label: t('sales.common.retry'), color: 'error', variant: 'soft', onClick: loadOrderData }]"
    />

    <!-- Not logged in: inline helper login form (PIN fallback) -->
    <div
      v-else-if="publicEvent"
      class="p-6"
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
