<script setup lang="ts">
/**
 * Inline POS Block Public Renderer
 *
 * Embeds the full helper POS for one event inside a CMS page. Combines the
 * two flows from /order/[team]/[event]/{login,index} into a single component:
 *
 *   not authenticated  →  inline PIN + name login form
 *   authenticated      →  <SalesClientOrderInterface> with logout
 *
 * BlockContent.vue wraps this in <ClientOnly> (clientOnly: true in block def).
 * No SSR for helper sessions — they live in localStorage.
 */
import type { SalesProduct } from '~~/layers/sales/collections/products/types'
import type { SalesCategorie } from '~~/layers/sales/collections/categories/types'

interface OrderInterfaceAttrs {
  eventSlug?: string
  /** How tall the embedded POS renders. 'fill' measures its offset and grows to the viewport bottom. */
  height?: 'compact' | 'tall' | 'fill'
}

interface Props {
  attrs: OrderInterfaceAttrs
}

interface PublicEvent {
  id: string
  teamId: string
  title: string
  slug: string
  status?: string
}

interface Client {
  id: string
  title: string
}

interface OrderData {
  event: { id: string, title: string, slug: string, teamId: string, requiresClient: boolean }
  products: SalesProduct[]
  categories: SalesCategorie[]
  clients: Client[]
  settings: { useReusableClients: boolean }
  helper: { id: string, name: string }
}

const props = defineProps<Props>()
const route = useRoute()

// On a CMS page rendered at /[team]/[...slug], the team slug lives here.
// The block has its own eventSlug attribute (chosen by the editor).
const teamSlug = computed(() => String(route.params.team || ''))
const eventSlug = computed(() => props.attrs.eventSlug || '')

// --- Embedded POS height -------------------------------------------------
// Compact/Tall are simple bounded heights that flow inside the page. Fill
// measures the wrapper's distance from the top of the viewport and grows to
// the bottom edge, so a POS-only page reads as a full-screen app. Recomputed
// on mount + resize (not on scroll — the POS scrolls internally, not the page).
const heightMode = computed(() => props.attrs.height || 'tall')
const posWrapper = ref<HTMLElement | null>(null)
const fillHeight = ref('')

const posHeightClass = computed(() => {
  if (heightMode.value === 'compact') return 'h-[60vh]'
  if (heightMode.value === 'tall') return 'h-[80vh]'
  return '' // fill drives height via inline style
})
const posHeightStyle = computed(() =>
  heightMode.value === 'fill' && fillHeight.value
    ? { height: fillHeight.value }
    : undefined
)

function recomputeFillHeight() {
  if (heightMode.value !== 'fill' || !posWrapper.value) return
  const top = Math.max(0, Math.round(posWrapper.value.getBoundingClientRect().top))
  fillHeight.value = `calc(100dvh - ${top}px)`
}

useEventListener('resize', recomputeFillHeight)

const {
  isHelper,
  loadSession,
  logout,
  token,
  eventId: sessionEventId,
  teamId: sessionTeamId,
  login
} = useHelperAuth()

// Lookup result: the event metadata fetched via the public by-slug endpoint.
const publicEvent = ref<PublicEvent | null>(null)
const lookupError = ref<string | null>(null)
const orderData = ref<OrderData | null>(null)
const loadError = ref<string | null>(null)
const initialLoading = ref(true)

// The POS wrapper only mounts once orderData resolves — (re)measure fill
// height when it appears or the height mode changes.
watch([orderData, heightMode], async () => {
  await nextTick()
  recomputeFillHeight()
})

// Login form state
const formState = reactive({ helperName: '', pin: '' })
const loginError = ref('')
const submitting = ref(false)

async function loadEvent() {
  if (!teamSlug.value || !eventSlug.value) {
    initialLoading.value = false
    return
  }
  try {
    publicEvent.value = await $fetch<PublicEvent>(
      `/api/crouton-sales/events/${teamSlug.value}/by-slug/${eventSlug.value}`
    )
  }
  catch (err: any) {
    lookupError.value = err?.data?.message || err?.statusMessage || 'Event not found'
  }
}

async function loadOrderData() {
  if (!publicEvent.value) return
  // Helper session must match this event AND team — guards against pasting a
  // stale session from a different event.
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
    loadError.value = err?.data?.message || err?.statusMessage || 'Failed to load order data'
  }
}

async function onLoginSubmit() {
  if (!publicEvent.value) return
  if (!formState.helperName.trim()) {
    loginError.value = 'Please enter your name.'
    return
  }
  if (!formState.pin.trim()) {
    loginError.value = 'Please enter the PIN.'
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
    loginError.value = 'Login failed. Please check your PIN.'
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
  <div class="order-interface-block">
    <!-- Editor didn't pick an event -->
    <div
      v-if="!eventSlug"
      class="bg-muted/80 rounded-3xl border border-dashed border-default p-6 text-center text-sm text-muted"
    >
      <UIcon name="i-lucide-shopping-cart" class="w-6 h-6 mx-auto mb-2 text-muted" />
      No event selected for this POS block.
    </div>

    <!-- Lookup failed -->
    <UAlert
      v-else-if="lookupError"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      :title="lookupError"
    />

    <!-- Initial event lookup pending -->
    <div
      v-else-if="initialLoading"
      class="bg-muted/80 rounded-3xl border border-default p-6 text-center"
    >
      <UIcon name="i-lucide-loader-2" class="w-6 h-6 mx-auto animate-spin text-muted" />
    </div>

    <!-- Authenticated + data loaded → full POS -->
    <div
      v-else-if="orderData"
      ref="posWrapper"
      class="rounded-3xl border border-default overflow-clip bg-default flex flex-col"
      :class="posHeightClass"
      :style="posHeightStyle"
    >
      <!-- Header keeps everything left-aligned because the CMS shell has a
           fixed-position user-menu pill at top-right that would otherwise
           cover (and intercept clicks on) any top-right block controls. -->
      <header class="flex items-start gap-3 px-4 py-3 border-b border-default shrink-0">
        <UIcon name="i-lucide-store" class="text-primary text-xl mt-0.5 shrink-0" />
        <div class="flex-1 min-w-0">
          <h2 class="font-semibold text-lg leading-tight truncate">{{ orderData.event.title }}</h2>
          <div class="flex items-center gap-2 mt-1 text-sm text-muted">
            <span>Logged in as <span class="text-default font-medium">{{ orderData.helper.name }}</span></span>
            <span aria-hidden="true">·</span>
            <UButton
              variant="link"
              color="primary"
              size="sm"
              class="p-0"
              label="Log out"
              @click.stop="handleLogout"
            />
          </div>
        </div>
      </header>
      <!-- Fills the remaining viewport height; the POS handles its own
           internal scrolling for the product grid + cart. -->
      <div class="flex-1 min-h-0">
        <SalesClientOrderInterface
          :event-id="orderData.event.id"
          :products="orderData.products"
          :categories="orderData.categories"
          :clients="orderData.clients"
          :requires-client="orderData.event.requiresClient"
          :use-reusable-clients="orderData.settings.useReusableClients"
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
      :actions="[{ label: 'Retry', color: 'error', variant: 'soft', onClick: loadOrderData }]"
    />

    <!-- Not logged in: inline helper login form -->
    <div
      v-else-if="publicEvent"
      class="bg-default rounded-3xl border border-default p-6"
    >
      <div class="max-w-sm mx-auto space-y-5">
        <div class="text-center">
          <UIcon name="i-lucide-store" class="text-3xl text-primary mb-2" />
          <h2 class="text-lg font-semibold">{{ publicEvent.title }}</h2>
          <p class="text-sm text-muted mt-1">Helper login required to take orders.</p>
        </div>
        <UForm :state="formState" class="space-y-3" @submit="onLoginSubmit">
          <UFormField label="Your name" name="helperName">
            <UInput
              v-model="formState.helperName"
              placeholder="Enter your name"
              size="lg"
              class="w-full"
              autocomplete="name"
            />
          </UFormField>
          <UFormField label="PIN" name="pin">
            <UInput
              v-model="formState.pin"
              type="password"
              placeholder="Enter PIN"
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
            Log in
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
