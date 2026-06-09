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

const { items: allSettings, refresh: refreshSettings } = await useCollectionQuery('salesEventsettings')

const eventSettings = computed(() =>
  ((allSettings.value as SalesEventsetting[] | null) || []).filter(s => s.eventId === props.event.id)
)

const clientModeSetting = computed(() =>
  eventSettings.value.find(s => s.settingKey === 'use_reusable_clients')
)

const useReusableClients = ref(false)
const savingClientMode = ref(false)
const helperPin = ref(props.event.helperPin || '')
const originalHelperPin = ref(props.event.helperPin || '')
const savingHelperPin = ref(false)
const showReceiptSettings = ref(false)

// Inline-editable core event details (title / type / dates / status).
// Slug is intentionally excluded — it is the route param and editing it here
// would break the current URL. Use the top-right "Edit" button for the slug.
const statusOptions = [
  { label: t('sales.workspace.statusUpcoming'), value: 'upcoming' },
  { label: t('sales.workspace.statusActive'), value: 'active' },
  { label: t('sales.workspace.statusCompleted'), value: 'completed' },
  { label: t('sales.workspace.statusCancelled'), value: 'cancelled' }
]

const currencyOptions = [
  { label: t('sales.workspace.currencyEur'), value: 'EUR' },
  { label: t('sales.workspace.currencyUsd'), value: 'USD' }
]

const eventForm = ref({
  title: props.event.title || '',
  eventType: props.event.eventType || '',
  startDate: props.event.startDate ? new Date(props.event.startDate) : null,
  endDate: props.event.endDate ? new Date(props.event.endDate) : null,
  status: props.event.status || 'upcoming',
  currency: props.event.currency || 'EUR'
})
const savingEventDetails = ref(false)

// Re-seed the form when the event changes (switching events, or an external
// edit via the top-right "Edit" button).
watch(() => props.event.id, () => {
  eventForm.value = {
    title: props.event.title || '',
    eventType: props.event.eventType || '',
    startDate: props.event.startDate ? new Date(props.event.startDate) : null,
    endDate: props.event.endDate ? new Date(props.event.endDate) : null,
    status: props.event.status || 'upcoming',
    currency: props.event.currency || 'EUR'
  }
})

const toTime = (d: Date | string | null | undefined) => (d ? new Date(d).getTime() : null)
const eventDetailsDirty = computed(() =>
  eventForm.value.title !== (props.event.title || '')
  || eventForm.value.eventType !== (props.event.eventType || '')
  || eventForm.value.status !== (props.event.status || 'upcoming')
  || eventForm.value.currency !== (props.event.currency || 'EUR')
  || toTime(eventForm.value.startDate) !== toTime(props.event.startDate)
  || toTime(eventForm.value.endDate) !== toTime(props.event.endDate)
)

async function saveEventDetails() {
  savingEventDetails.value = true
  try {
    const { update } = useCollectionMutation('salesEvents')
    await update(props.event.id, {
      title: eventForm.value.title,
      eventType: eventForm.value.eventType || undefined,
      startDate: eventForm.value.startDate instanceof Date ? eventForm.value.startDate.toISOString() : null,
      endDate: eventForm.value.endDate instanceof Date ? eventForm.value.endDate.toISOString() : null,
      status: eventForm.value.status,
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

function openCreateCategory() {
  open('create', 'salesCategories', [], 'slideover', { eventId: props.event.id })
}

function openCreateLocation() {
  open('create', 'salesLocations', [], 'slideover', { eventId: props.event.id })
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
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">{{ t('sales.workspace.eventDetails') }}</h3>
          <UButton
            size="xs"
            :loading="savingEventDetails"
            :disabled="!eventDetailsDirty"
            @click="saveEventDetails"
          >
            {{ t('sales.common.save') }}
          </UButton>
        </div>
      </template>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField :label="t('sales.workspace.eventName')" class="sm:col-span-2">
          <UInput v-model="eventForm.title" class="w-full" :placeholder="t('sales.workspace.eventNamePlaceholder')" />
        </UFormField>
        <UFormField :label="t('sales.workspace.eventType')">
          <UInput v-model="eventForm.eventType" class="w-full" :placeholder="t('sales.workspace.eventTypePlaceholder')" />
        </UFormField>
        <UFormField :label="t('sales.workspace.status')">
          <USelect v-model="eventForm.status" :items="statusOptions" class="w-full" />
        </UFormField>
        <UFormField :label="t('sales.workspace.currency')">
          <USelect v-model="eventForm.currency" :items="currencyOptions" class="w-full" />
        </UFormField>
        <UFormField :label="t('sales.workspace.startDate')">
          <CroutonCalendar v-model:date="eventForm.startDate" />
        </UFormField>
        <UFormField :label="t('sales.workspace.endDate')">
          <CroutonCalendar v-model:date="eventForm.endDate" />
        </UFormField>
      </div>
    </UCard>

    <!-- Top settings row -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard variant="soft">
        <div class="space-y-3">
          <h3 class="font-semibold">{{ t('sales.workspace.clientSelection') }}</h3>
          <USwitch
            v-model="useReusableClients"
            :label="t('sales.workspace.useReusableClients')"
            :description="t('sales.workspace.useReusableClientsDesc')"
            :loading="savingClientMode"
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

    <!-- Categories -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">{{ t('sales.categories.title') }}</h3>
          <UButton size="xs" variant="outline" icon="i-lucide-plus" @click="openCreateCategory">
            {{ t('sales.common.add') }}
          </UButton>
        </div>
      </template>
      <div v-if="categoriesPending" class="p-4 text-center text-muted text-sm">
        {{ t('sales.common.loading') }}
      </div>
      <CroutonCollection
        v-else-if="categories && (categories as any[]).length > 0"
        layout="grid"
        collection="salesCategories"
        :rows="categories"
      />
      <div v-else class="p-4 text-center text-muted text-sm">
        {{ t('sales.workspace.noCategories') }}
      </div>
    </UCard>

    <!-- Locations -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">{{ t('sales.sidebar.locations') }}</h3>
          <UButton size="xs" variant="outline" icon="i-lucide-plus" @click="openCreateLocation">
            {{ t('sales.common.add') }}
          </UButton>
        </div>
      </template>
      <div v-if="locationsPending" class="p-4 text-center text-muted text-sm">
        {{ t('sales.common.loading') }}
      </div>
      <CroutonCollection
        v-else-if="locations && (locations as any[]).length > 0"
        layout="grid"
        collection="salesLocations"
        :rows="locations"
      />
      <div v-else class="p-4 text-center text-muted text-sm">
        {{ t('sales.workspace.noLocations') }}
      </div>
    </UCard>

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
