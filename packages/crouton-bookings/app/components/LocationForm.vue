<!--
  CroutonBookingsLocationForm
  Package-provided form for the bookings locations collection.
  Replaces the CLI-generated _Form.vue with a polished 3-tab layout.

  Maps integration is optional — works with or without @fyit/crouton-maps.
  When maps is installed: shows interactive map with geocoding.
  When maps is absent: shows address fields only.
-->

<template>
  <CroutonFormActionButton
    v-if="action === 'delete'"
    :action="action"
    :collection="collection"
    :items="items"
    :loading="loading"
    @click="handleSubmit"
  />

  <UForm
    v-else
    :schema="schema"
    :state="state"
    @submit="handleSubmit"
    @error="handleValidationError"
  >
    <CroutonFormLayout :tabs="tabs" :navigation-items="navigationItems" :tab-errors="tabErrorCounts" v-model="activeSection">
      <template #main="{ activeSection }">
        <!-- Settings -->
        <div v-show="activeSection === 'settings'" class="flex flex-col gap-6 p-1">
          <fieldset class="flex flex-col gap-4">
            <legend class="text-sm font-semibold text-gray-900 dark:text-white mb-1">Location Details</legend>
            <p class="text-sm text-gray-500 -mt-1">Display color for this location.</p>
            <UFormField label="Color" name="color">
              <UColorPicker v-model="state.color" />
            </UFormField>
          </fieldset>

          <USeparator />

          <!-- Address & Map -->
          <fieldset class="flex flex-col gap-4">
            <legend class="text-sm font-semibold text-gray-900 dark:text-white mb-1">Address</legend>
            <p class="text-sm text-gray-500 -mt-1">
              {{ hasMaps ? 'Physical address and map pin. The map updates automatically as you type.' : 'Physical address for this location.' }}
            </p>
            <UFormField label="Street" name="street">
              <UInput v-model="state.street" class="w-full" />
            </UFormField>
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="ZIP Code" name="zip">
                <UInput v-model="state.zip" class="w-full" />
              </UFormField>
              <UFormField label="City" name="city">
                <UInput v-model="state.city" class="w-full" />
              </UFormField>
            </div>
            <UFormField v-if="hasMaps" label="Location Map" name="location">
              <CroutonMapsMap
                :center="mapCenter"
                :zoom="14"
                height="400px"
                class="rounded-lg border"
                :fly-to-on-center-change="true"
                @load="handleMapLoad"
              >
                <template #default="{ map }">
                  <CroutonMapsMarker
                    v-if="mapCenter[0] !== 0 || mapCenter[1] !== 0"
                    :map="map"
                    :position="mapCenter"
                    :color="markerColor"
                    :options="{ draggable: true }"
                    :animate-transitions="true"
                    @dragEnd="handleMarkerDragEnd"
                  />
                </template>
              </CroutonMapsMap>
              <p v-if="geocoding" class="text-sm text-gray-500 mt-2">
                Geocoding address...
              </p>
            </UFormField>
          </fieldset>

          <USeparator />

          <!-- Access Control -->
          <fieldset class="flex flex-col gap-4">
            <legend class="text-sm font-semibold text-gray-900 dark:text-white mb-1">Access Control</legend>
            <p class="text-sm text-gray-500 -mt-1">Restrict which members can book this location. Leave empty to allow all team members.</p>
            <UFormField label="Allowed Members" name="allowedMemberIds">
              <USelectMenu
                v-model="state.allowedMemberIds"
                :items="memberItems"
                multiple
                value-key="value"
                :loading="membersLoading"
                icon="i-lucide-users"
                placeholder="All team members"
                class="w-full"
                :filter-fields="['label', 'email']"
              >
                <template #item-label="{ item }">
                  {{ item.label }}
                  <span class="text-muted">{{ item.email }}</span>
                </template>
              </USelectMenu>
            </UFormField>
          </fieldset>
        </div>

        <!-- Bookings -->
        <div v-show="activeSection === 'bookings'" class="flex flex-col gap-6 p-1">
          <fieldset class="flex flex-col gap-4">
            <legend class="text-sm font-semibold text-gray-900 dark:text-white mb-1">Booking Rules</legend>
            <p class="text-sm text-gray-500 -mt-1">Control how bookings work at this location.</p>
            <UFormField label="Booking Mode" name="inventoryMode">
              <URadioGroup
                :model-value="state.inventoryMode ? 'inventory' : 'slots'"
                orientation="horizontal"
                variant="card"
                :items="[
                  { label: 'Time Slots', description: 'Book specific named time slots per day', value: 'slots' },
                  { label: 'Inventory', description: 'Book from a pool of available units', value: 'inventory' },
                ]"
                @update:model-value="(v: string) => state.inventoryMode = v === 'inventory'"
              />
            </UFormField>
            <UFormField v-show="state.inventoryMode" label="Available Units" name="quantity" help="Number of units available for booking at the same time.">
              <UInputNumber v-model="state.quantity" class="w-full" />
            </UFormField>
            <UFormField label="Max Bookings Per Month" name="maxBookingsPerMonth" help="Limit how many bookings a single user can make per calendar month. Leave empty for unlimited.">
              <UInputNumber v-model="state.maxBookingsPerMonth" class="w-full" :min="0" placeholder="Unlimited" />
            </UFormField>
          </fieldset>

          <USeparator />

          <fieldset class="flex flex-col gap-4">
            <legend class="text-sm font-semibold text-gray-900 dark:text-white mb-1">Scheduling</legend>
            <p class="text-sm text-gray-500 -mt-1">Define when this location is available for bookings.</p>
            <UFormField v-if="!state.inventoryMode" label="Slots" name="slots">
              <CroutonFormRepeater
                v-model="state.slots"
                component-name="BookingsLocationsSlotInput"
                add-label="Add Time Slot"
                :sortable="true"
              />
            </UFormField>
            <UFormField label="Open Days" name="openDays">
              <CroutonBookingsOpenDaysPicker v-model="state.openDays" />
            </UFormField>
            <UFormField v-if="!state.inventoryMode && state.slots?.length" label="Slot Schedule" name="slotSchedule">
              <CroutonBookingsScheduleGrid v-model="state.slotSchedule" :slots="state.slots" />
            </UFormField>
            <UFormField label="Blocked Dates" name="blockedDates">
              <CroutonFormRepeater
                v-model="state.blockedDates"
                component-name="CroutonBookingsBlockedDateInput"
                add-label="Add Blocked Period"
                :sortable="false"
              />
            </UFormField>
          </fieldset>
        </div>

        <!-- Content -->
        <div v-show="activeSection === 'content'" class="flex flex-col gap-4 p-1">
          <CroutonI18nInput
            v-model="state.translations"
            :fields="['title', 'content']"
            :default-values="{
              title: state.title || '',
              content: state.content || ''
            }"
            :field-components="{
              content: 'CroutonEditorSimple'
            }"
            show-ai-translate
            field-type="locations"
            label="Translations"
          />
        </div>
      </template>

      <template #footer>
        <CroutonValidationErrorSummary
          v-if="validationErrors.length > 0"
          :tab-errors="tabErrorCounts"
          :navigation-items="navigationItems"
          @switch-tab="switchToTab"
        />

        <CroutonFormActionButton
          :action="action"
          :collection="collection"
          :items="items"
          :loading="loading"
          :has-validation-errors="validationErrors.length > 0"
        />
      </template>
    </CroutonFormLayout>
  </UForm>
</template>

<script setup lang="ts">
import type { LocationData } from '../types/booking'

// useBookingsLocations is auto-imported from the generated collection layer at runtime
declare function useBookingsLocations(): {
  defaultValue: Record<string, any>
  schema: any
  collection: string
}

interface LocationFormProps {
  action: 'create' | 'update' | 'delete'
  items?: Array<{ id: string }>
  activeItem?: LocationData | null
}

const props = defineProps<LocationFormProps>()
const { defaultValue, schema, collection } = useBookingsLocations()

// Optional maps integration — gracefully degrades when crouton-maps is not installed
const { hasApp } = useCroutonApps()
const hasMaps = hasApp('maps')

// Load team members for access control picker
const { members: teamMembers, loadMembers } = useTeam()
const membersLoading = ref(false)

onMounted(async () => {
  membersLoading.value = true
  try { await loadMembers() } finally { membersLoading.value = false }
})

const memberItems = computed(() =>
  teamMembers.value.map((m: any) => ({
    label: m.user?.name || m.user?.email || 'Unknown',
    email: m.user?.email || '',
    value: m.userId,
    avatar: { src: m.user?.image, alt: m.user?.name || m.user?.email || '' }
  }))
)

// Form layout: 3 tabs
const navigationItems = [
  { label: 'Settings', value: 'settings', icon: 'i-lucide-settings' },
  { label: 'Bookings', value: 'bookings', icon: 'i-lucide-calendar' },
  { label: 'Content', value: 'content', icon: 'i-lucide-globe' }
]

const tabs = ref(true)
const activeSection = ref('settings')

// Map field names to tabs for validation error indicators
const fieldToGroup: Record<string, string> = {
  title: 'settings',
  color: 'settings',
  street: 'settings',
  zip: 'settings',
  city: 'settings',
  content: 'settings',
  location: 'settings',
  allowedMemberIds: 'settings',
  inventoryMode: 'bookings',
  quantity: 'bookings',
  maxBookingsPerMonth: 'bookings',
  slots: 'bookings',
  openDays: 'bookings',
  slotSchedule: 'bookings',
  blockedDates: 'bookings',
  translations: 'content'
}

const validationErrors = ref<Array<{ name: string; message: string }>>([])

const handleValidationError = (event: any) => {
  if (event?.errors) {
    validationErrors.value = event.errors
  }
}

const tabErrorCounts = computed(() => {
  const counts: Record<string, number> = {}
  validationErrors.value.forEach((error) => {
    const tabName = fieldToGroup[error.name] || 'settings'
    counts[tabName] = (counts[tabName] || 0) + 1
  })
  return counts
})

const switchToTab = (tabValue: string) => {
  activeSection.value = tabValue
}

// Data operations
const { create, update, deleteItems } = useCollectionMutation(collection)
const { close, loading } = useCrouton()

// Initialize form state
const initialValues = props.action === 'update' && props.activeItem?.id
  ? { ...defaultValue, ...props.activeItem }
  : { ...defaultValue }

const state = ref<LocationData & { id?: string | null }>(initialValues as any)

// --- Map & Geocoding (only active when @fyit/crouton-maps is installed) ---

const geocoding = ref(false)
const mapCenter = ref<[number, number]>([0, 0])
const mapInstance = ref<any>(null)

// Derive marker color from CSS --ui-primary at runtime
const markerColor = ref('#22c55e')
onMounted(() => {
  if (!hasMaps) return
  const tempEl = document.createElement('div')
  tempEl.style.backgroundColor = 'var(--ui-primary)'
  tempEl.style.display = 'none'
  document.body.appendChild(tempEl)
  const computedColor = getComputedStyle(tempEl).backgroundColor
  document.body.removeChild(tempEl)
  if (computedColor?.startsWith('rgb')) {
    const m = computedColor.match(/\d+/g)
    if (m && m.length >= 3) {
      markerColor.value = `#${((1 << 24) + (Number(m[0]) << 16) + (Number(m[1]) << 8) + Number(m[2])).toString(16).slice(1)}`
    }
  }
})

// Parse existing coordinates from the location field
const parseCoordinates = (value: any): [number, number] | null => {
  if (!value) return null
  if (Array.isArray(value) && value.length === 2) {
    return [Number(value[0]), Number(value[1])]
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed) && parsed.length === 2) {
        return [Number(parsed[0]), Number(parsed[1])]
      }
    } catch { return null }
  }
  return null
}

const initialCoordinates = parseCoordinates(state.value.location)
if (initialCoordinates) mapCenter.value = initialCoordinates

const handleMapLoad = (map: any) => { mapInstance.value = map }

// Auto-geocode address changes via the /api/maps/geocode endpoint (no composable dependency)
watchDebounced(
  () => [state.value.street, state.value.zip, state.value.city],
  async () => {
    if (hasMaps && (state.value.street || state.value.zip)) {
      await handleGeocode()
    }
  },
  { debounce: 1000, maxWait: 3000 }
)

const handleGeocode = async () => {
  try {
    geocoding.value = true
    const parts: string[] = []
    if (state.value.street) parts.push(state.value.street as string)
    if (state.value.zip) parts.push(state.value.zip as string)
    if (state.value.city) parts.push(state.value.city as string)

    const query = parts.join(', ')
    if (!query.trim()) return

    const response = await $fetch<{ features: Array<{ center: [number, number] }> }>('/api/maps/geocode', {
      query: { q: query }
    })

    if (response.features?.[0]) {
      mapCenter.value = response.features[0].center
      state.value.location = JSON.stringify(response.features[0].center)
    }
  } catch {
    // Maps API not available or geocoding failed — silent fallback
  } finally {
    geocoding.value = false
  }
}

const handleMarkerDragEnd = (position: { lng: number; lat: number }) => {
  mapCenter.value = [position.lng, position.lat]
  state.value.location = JSON.stringify([position.lng, position.lat])
}

// --- Form submission ---

const handleSubmit = async () => {
  try {
    if (props.action === 'create') {
      await create(state.value)
    } else if (props.action === 'update' && state.value.id) {
      await update(state.value.id, state.value)
    } else if (props.action === 'delete') {
      await deleteItems(props.items)
    }
    validationErrors.value = []
    close()
  } catch (error) {
    console.error('Form submission failed:', error)
  }
}
</script>
