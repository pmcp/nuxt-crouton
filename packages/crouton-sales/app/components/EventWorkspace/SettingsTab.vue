<script setup lang="ts">
import type { SalesEvent } from '~~/layers/sales/collections/events/types'
import type { SalesEventsetting } from '~~/layers/sales/collections/eventsettings/types'

const props = defineProps<{ event: SalesEvent }>()

const { t } = useT()
const { open } = useCrouton()
const route = useRoute()
const teamParam = computed(() => route.params.team as string)

const eventQuery = computed(() => ({ eventId: props.event.id }))
const { items: categories, pending: categoriesPending } = await useCollectionQuery('salesCategories', { query: eventQuery })
const { items: locations, pending: locationsPending } = await useCollectionQuery('salesLocations', { query: eventQuery })
const { items: printers, pending: printersPending } = await useCollectionQuery('salesPrinters', { query: eventQuery })

// Rows for the compact list cards. Categories are sorted by displayOrder —
// the same order the kassa tabs use — so drag-reorder here is WYSIWYG.
const categoryRows = computed(() =>
  (((categories.value as any[] | null) || []))
    .slice()
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || String(a.title).localeCompare(String(b.title)))
)

const locationRows = computed(() => ((locations.value as any[] | null) || []))

const printerRows = computed(() =>
  (((printers.value as any[] | null) || [])).map(p => ({
    ...p,
    subtitle: [
      locationRows.value.find(l => l.id === p.locationId)?.title,
      p.isActive === false ? t('sales.common.inactive') : undefined
    ].filter(Boolean).join(' · ') || undefined
  }))
)

// Requeue failed/stuck print jobs (moved from the removed Printers tab).
const notify = useNotify()
const resending = ref(false)
async function resendFailedJobs() {
  resending.value = true
  try {
    const res = await $fetch<{ requeued: number }>(
      `/api/crouton-sales/teams/${teamParam.value}/events/${props.event.id}/printqueues/retry-failed`,
      { method: 'POST' }
    )
    if (res.requeued > 0) {
      notify.success(t('sales.printQueue.resendQueued', { params: { count: res.requeued }, fallback: `Requeued ${res.requeued} print job(s)` }))
    }
    else {
      notify.info(t('sales.printQueue.resendNone', 'No failed print jobs to resend'))
    }
  }
  catch {
    notify.error(t('sales.printQueue.resendError', 'Could not requeue print jobs'))
  }
  finally {
    resending.value = false
  }
}

const { items: allSettings, refresh: refreshSettings } = await useCollectionQuery('salesEventsettings')

const eventSettings = computed(() =>
  ((allSettings.value as SalesEventsetting[] | null) || []).filter(s => s.eventId === props.event.id)
)

const clientModeSetting = computed(() =>
  eventSettings.value.find(s => s.settingKey === 'use_reusable_clients')
)

const useReusableClients = ref(false)
const savingClientMode = ref(false)

// The POS only shows the client selector when the event's requiresClient is
// truthy (OrderInterface gates on it) — mirror that here so the switch shows
// what the kassa actually does. The reusable-clients mode below only applies
// while this is on.
const requiresClient = ref(!!props.event.requiresClient)
const savingRequiresClient = ref(false)
const helperPin = ref(props.event.helperPin || '')
const originalHelperPin = ref(props.event.helperPin || '')
const savingHelperPin = ref(false)
const showReceiptSettings = ref(false)

// Inline-editable core event details (title / currency).
// Slug is intentionally excluded — it is the route param and editing it here
// would break the current URL. Use the top-right "Edit" button for the slug.
const currencyOptions = [
  { label: t('sales.workspace.currencyEur'), value: 'EUR' },
  { label: t('sales.workspace.currencyUsd'), value: 'USD' }
]

const eventForm = ref({
  title: props.event.title || '',
  currency: props.event.currency || 'EUR'
})
const savingEventDetails = ref(false)

// Re-seed the form when the event changes (switching events, or an external
// edit via the top-right "Edit" button).
watch(() => props.event.id, () => {
  eventForm.value = {
    title: props.event.title || '',
    currency: props.event.currency || 'EUR'
  }
  requiresClient.value = !!props.event.requiresClient
})

const eventDetailsDirty = computed(() =>
  eventForm.value.title !== (props.event.title || '')
  || eventForm.value.currency !== (props.event.currency || 'EUR')
)

async function saveEventDetails() {
  savingEventDetails.value = true
  try {
    const { update } = useCollectionMutation('salesEvents')
    await update(props.event.id, {
      title: eventForm.value.title,
      currency: eventForm.value.currency
    })
  }
  finally {
    savingEventDetails.value = false
  }
}

watch(clientModeSetting, (s) => {
  if (s) useReusableClients.value = s.settingValue === 'true'
}, { immediate: true })

async function saveRequiresClient(value: boolean) {
  savingRequiresClient.value = true
  try {
    const { update } = useCollectionMutation('salesEvents')
    await update(props.event.id, { requiresClient: value })
  }
  catch {
    requiresClient.value = !value
  }
  finally {
    savingRequiresClient.value = false
  }
}

async function saveClientModeSetting(value: boolean) {
  savingClientMode.value = true
  try {
    const { create, update } = useCollectionMutation('salesEventsettings')
    if (clientModeSetting.value) {
      await update(clientModeSetting.value.id, { settingValue: String(value) })
    }
    else {
      await create({
        eventId: props.event.id,
        settingKey: 'use_reusable_clients',
        settingValue: String(value),
        description: 'Whether to use reusable clients or free-text names'
      })
    }
    await refreshSettings()
  }
  catch {
    useReusableClients.value = !value
  }
  finally {
    savingClientMode.value = false
  }
}

async function saveHelperPin() {
  savingHelperPin.value = true
  try {
    const { update } = useCollectionMutation('salesEvents')
    await update(props.event.id, { helperPin: helperPin.value || undefined })
    originalHelperPin.value = helperPin.value
  }
  finally {
    savingHelperPin.value = false
  }
}

// Event-level actions (moved out of the workspace header to declutter it).
// Same useCollectionQuery cache as the Shell, so refresh() updates its list
// before navigating to the duplicated event's slug.
const router = useRouter()
const { refresh: refreshEvents } = await useCollectionQuery('salesEvents')

const duplicating = ref(false)
async function duplicateEvent() {
  duplicating.value = true
  try {
    const response = await $fetch<{ slug?: string }>(
      `/api/crouton-sales/teams/${teamParam.value}/events/${props.event.id}/duplicate`,
      { method: 'POST' }
    )
    if (response?.slug) {
      await refreshEvents()
      router.push(`/admin/${teamParam.value}/sales/events/${response.slug}`)
    }
  }
  finally {
    duplicating.value = false
  }
}

// Delete opens the standard confirm; the Shell's crouton:mutation hook
// navigates back to the events list once the delete lands.
function deleteEvent() {
  open('delete', 'salesEvents', [props.event.id])
}

// Active helpers card (scoped tokens, not a collection)
interface ActiveHelper {
  id: string
  displayName: string
  role: string
  expiresAt: string
  lastActiveAt: string | null
}

const { data: activeHelpers, pending: activeHelpersPending, refresh: refreshActiveHelpers } = await useFetch<ActiveHelper[]>(
  () => `/api/crouton-sales/teams/${teamParam.value}/events/${props.event.id}/active-helpers`,
  { default: () => [] }
)
</script>

<template>
  <div class="space-y-6">
    <!-- Event details (inline editable) -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-2">
          <h3 class="font-semibold">{{ t('sales.workspace.eventDetails') }}</h3>
          <div class="flex items-center gap-2">
            <UButton
              size="xs"
              variant="outline"
              color="neutral"
              icon="i-lucide-copy"
              :loading="duplicating"
              @click="duplicateEvent"
            >
              {{ t('sales.events.duplicate') }}
            </UButton>
            <UButton
              size="xs"
              variant="outline"
              color="error"
              icon="i-lucide-trash-2"
              @click="deleteEvent"
            >
              {{ t('common.delete') }}
            </UButton>
            <UButton
              size="xs"
              :loading="savingEventDetails"
              :disabled="!eventDetailsDirty"
              @click="saveEventDetails"
            >
              {{ t('sales.common.save') }}
            </UButton>
          </div>
        </div>
      </template>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField :label="t('sales.workspace.eventName')">
          <UInput v-model="eventForm.title" class="w-full" :placeholder="t('sales.workspace.eventNamePlaceholder')" />
        </UFormField>
        <UFormField :label="t('sales.workspace.currency')">
          <USelect v-model="eventForm.currency" :items="currencyOptions" class="w-full" />
        </UFormField>
      </div>
    </UCard>

    <!-- Top settings row -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard variant="soft">
        <div class="space-y-3">
          <h3 class="font-semibold">{{ t('sales.workspace.clientSelection') }}</h3>
          <USwitch
            v-model="requiresClient"
            :label="t('sales.workspace.requiresClient')"
            :description="t('sales.workspace.requiresClientDesc')"
            :loading="savingRequiresClient"
            @update:model-value="saveRequiresClient"
          />
          <USwitch
            v-model="useReusableClients"
            :label="t('sales.workspace.useReusableClients')"
            :description="t('sales.workspace.useReusableClientsDesc')"
            :loading="savingClientMode"
            :disabled="!requiresClient"
            @update:model-value="saveClientModeSetting"
          />
        </div>
      </UCard>

      <UCard variant="soft">
        <div class="space-y-3">
          <h3 class="font-semibold">{{ t('sales.workspace.helperPin') }}</h3>
          <div class="flex gap-2">
            <UInput
              v-model="helperPin"
              type="text"
              :placeholder="t('sales.helperLogin.enterPin')"
              size="sm"
              :ui="{ base: 'font-mono' }"
              class="flex-1"
            />
            <UButton
              size="sm"
              :loading="savingHelperPin"
              :disabled="helperPin === originalHelperPin"
              @click="saveHelperPin"
            >
              {{ t('sales.common.save') }}
            </UButton>
          </div>
        </div>
      </UCard>

      <UCard variant="soft">
        <div class="space-y-3">
          <h3 class="font-semibold">{{ t('sales.workspace.receiptSettings') }}</h3>
          <UButton
            variant="outline"
            icon="i-lucide-receipt"
            size="sm"
            block
            @click="showReceiptSettings = true"
          >
            {{ t('sales.workspace.editReceiptText') }}
          </UButton>
        </div>
      </UCard>
    </div>

    <!-- Catalog structure: compact editable lists. Categories drag-reorder
         drives the kassa tab order (displayOrder). -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
      <SalesEventWorkspaceSettingsListCard
        :title="t('sales.categories.title')"
        collection="salesCategories"
        :rows="categoryRows"
        :pending="categoriesPending"
        :empty-label="t('sales.workspace.noCategories')"
        :create-data="{ eventId: event.id }"
        order-field="displayOrder"
      />
      <SalesEventWorkspaceSettingsListCard
        :title="t('sales.sidebar.locations')"
        collection="salesLocations"
        :rows="locationRows"
        :pending="locationsPending"
        :empty-label="t('sales.workspace.noLocations')"
        :create-data="{ eventId: event.id }"
      />
      <SalesEventWorkspaceSettingsListCard
        :title="t('sales.sidebar.printers')"
        collection="salesPrinters"
        :rows="printerRows"
        :pending="printersPending"
        :empty-label="t('sales.workspace.noPrinters')"
        :create-data="{ eventId: event.id }"
      >
        <template #header-actions>
          <UButton
            size="xs"
            variant="outline"
            color="warning"
            icon="i-lucide-rotate-ccw"
            :loading="resending"
            :aria-label="t('sales.printQueue.resendFailed', 'Resend failed jobs')"
            @click="resendFailedJobs"
          />
        </template>
      </SalesEventWorkspaceSettingsListCard>
    </div>

    <!-- Active Helpers (scoped tokens, not a collection) -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">{{ t('sales.workspace.activeHelpers') }}</h3>
          <UButton
            size="xs"
            variant="ghost"
            icon="i-lucide-refresh-cw"
            :loading="activeHelpersPending"
            @click="() => refreshActiveHelpers()"
          />
        </div>
      </template>
      <div v-if="activeHelpersPending" class="p-4 text-center text-muted text-sm">
        {{ t('sales.common.loading') }}
      </div>
      <div v-else-if="activeHelpers && activeHelpers.length > 0" class="divide-y divide-default">
        <div
          v-for="h in activeHelpers"
          :key="h.id"
          class="flex items-center justify-between p-3"
        >
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-user" class="text-muted" />
            <span class="font-medium">{{ h.displayName }}</span>
          </div>
          <span class="text-xs text-muted">
            {{ t('sales.workspace.expires') }} {{ new Date(h.expiresAt).toLocaleString() }}
          </span>
        </div>
      </div>
      <div v-else class="p-4 text-center text-muted text-sm">
        {{ t('sales.workspace.noHelpers') }}
      </div>
    </UCard>

    <!-- Receipt settings modal -->
    <SalesSettingsReceiptSettingsModal
      v-if="event"
      v-model="showReceiptSettings"
      :api-endpoint="`/api/crouton-sales/teams/${teamParam}/events/${event.id}/receipt-settings`"
    />
  </div>
</template>
