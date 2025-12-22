<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { CalendarDate, getLocalTimeZone } from '@internationalized/date'

// Type helper for slot props (Vue proxies don't preserve class types)
function asDateValue(date: unknown): DateValue {
  return date as DateValue
}

const { t } = useI18n()

interface SlotItem {
  id: string
  label?: string
  value?: string
  color?: string
}

interface UserInfo {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
}

interface EmailStats {
  total: number
  sent: number
  pending: number
  failed: number
}

type TriggerType = 'booking_confirmed' | 'reminder_before' | 'booking_cancelled' | 'follow_up_after'

interface AvailableEmailAction {
  triggerType: TriggerType
  label: string
  icon: string
}

interface EmailTemplate {
  id: string
  triggerType: TriggerType
  locationId?: string | null
  isActive: boolean
}

interface Booking {
  id: string
  location: string
  date: string | Date
  slot: string[] | string | null
  group?: string | null
  status: string
  createdAt: string | Date
  locationData?: {
    id: string
    title: string
    street?: string
    city?: string
    slots?: SlotItem[] | string
  }
  ownerUser?: UserInfo | null
  createdByUser?: UserInfo | null
  emailStats?: EmailStats | null
}

interface StatusItem {
  id: string
  value: string
  color: 'success' | 'warning' | 'error' | 'info' | 'neutral'
}

// Status keys type
type StatusKey = 'active' | 'cancelled'

// Hardcoded statuses - labels come from translations
const STATUSES: StatusItem[] = [
  { id: '1', value: 'active', color: 'success' },
  { id: '2', value: 'cancelled', color: 'error' },
]

// Calendar view mode: 'week' (swipeable carousel) or 'month' (3-month grid)
type CalendarViewMode = 'week' | 'month'
const calendarViewMode = ref<CalendarViewMode>('week')

const route = useRoute()
const teamId = computed(() => route.params.team as string)

// Date-windowed loading configuration
const DAYS_BEFORE = 30  // Load 30 days before focus date
const DAYS_AFTER = 90   // Load 90 days after focus date

// Track the currently loaded date range
const loadedRange = ref<{ startDate: string, endDate: string } | null>(null)

// Helper to format date as YYYY-MM-DD for API queries
function formatDateParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Calculate date range around a focus date
function calculateDateRange(focusDate: Date = new Date()) {
  const start = new Date(focusDate)
  start.setDate(start.getDate() - DAYS_BEFORE)
  const end = new Date(focusDate)
  end.setDate(end.getDate() + DAYS_AFTER)
  return {
    startDate: formatDateParam(start),
    endDate: formatDateParam(end),
  }
}

// Initial date range centered on today
const initialRange = calculateDateRange()
const queryStartDate = ref(initialRange.startDate)
const queryEndDate = ref(initialRange.endDate)

// API response type
interface BookingsResponse {
  items: Booking[]
  dateRange: { startDate: string | null, endDate: string | null }
}

const { data: bookingsData, status, refresh } = useFetch<BookingsResponse>(
  () => `/api/crouton-bookings/teams/${teamId.value}/customer-bookings`,
  {
    key: 'customer-bookings',
    query: computed(() => ({
      startDate: queryStartDate.value,
      endDate: queryEndDate.value,
    })),
  },
)

// Extract bookings from response
const bookings = computed(() => bookingsData.value?.items || [])

// Update loaded range when data changes
watch(bookingsData, (data) => {
  if (data?.dateRange) {
    loadedRange.value = {
      startDate: data.dateRange.startDate || queryStartDate.value,
      endDate: data.dateRange.endDate || queryEndDate.value,
    }
  }
}, { immediate: true })

// Check if a date is within the loaded range
function isDateInLoadedRange(date: Date): boolean {
  if (!loadedRange.value) return false
  const dateStr = formatDateParam(date)
  return dateStr >= loadedRange.value.startDate && dateStr <= loadedRange.value.endDate
}

// Expand the date range when navigating outside loaded range
async function expandDateRange(targetDate: Date) {
  if (isDateInLoadedRange(targetDate)) return

  // Calculate new range centered on target date
  const newRange = calculateDateRange(targetDate)

  // Expand to cover both old and new ranges
  if (loadedRange.value) {
    queryStartDate.value = newRange.startDate < loadedRange.value.startDate
      ? newRange.startDate
      : loadedRange.value.startDate
    queryEndDate.value = newRange.endDate > loadedRange.value.endDate
      ? newRange.endDate
      : loadedRange.value.endDate
  }
  else {
    queryStartDate.value = newRange.startDate
    queryEndDate.value = newRange.endDate
  }
}

// Fetch settings for group labels (optional - may not exist if settings collection not generated)
interface GroupItem { id: string, label: string }
interface SettingsData { enableGroups?: boolean, groups?: GroupItem[] }
const { data: settingsData } = useFetch<SettingsData[]>(
  () => `/api/teams/${teamId.value}/bookings-settings`,
  {
    key: 'mybookings-settings',
    // Settings are optional - don't throw if not found
    default: () => [],
  },
)
const groupOptions = computed(() => settingsData.value?.[0]?.groups ?? [])

// Build label and icon for each trigger type
const triggerTypeInfo: Record<TriggerType, { label: string, icon: string }> = {
  booking_confirmed: { label: t('bookings.email.resendConfirmation'), icon: 'i-lucide-mail-check' },
  reminder_before: { label: t('bookings.email.sendReminder'), icon: 'i-lucide-bell' },
  booking_cancelled: { label: t('bookings.email.sendCancellation'), icon: 'i-lucide-mail-x' },
  follow_up_after: { label: t('bookings.email.sendFollowUp'), icon: 'i-lucide-mail-plus' },
}

// Use hardcoded statuses - labels come from translations
const statuses = STATUSES

// User overrides - starts empty (hydration-safe)
const statusOverrides = ref<Record<string, boolean>>({})

// Computed: defaults merged with user overrides
const statusFilters = computed(() =>
  Object.fromEntries(
    statuses.map(s => [
      s.value,
      statusOverrides.value[s.value] ?? s.value !== 'cancelled',
    ]),
  ),
)

// Toggle stores in overrides
function toggleStatus(key: string) {
  statusOverrides.value[key] = !statusFilters.value[key]
}

// Get unique locations from bookings with their slots
interface LocationWithSlots {
  id: string
  title: string
  slots: SlotItem[]
}

// Parse location slots helper
function parseLocationSlots(booking: Booking): SlotItem[] {
  if (!booking.locationData?.slots) return []
  try {
    const slots = typeof booking.locationData.slots === 'string'
      ? JSON.parse(booking.locationData.slots)
      : booking.locationData.slots
    return Array.isArray(slots) ? slots : []
  }
  catch {
    return []
  }
}

const availableLocations = computed<LocationWithSlots[]>(() => {
  if (!bookings.value) return []
  const locationMap = new Map<string, { title: string, slots: SlotItem[] }>()
  bookings.value.forEach((b) => {
    if (b.location && b.locationData?.title && !locationMap.has(b.location)) {
      const slots = parseLocationSlots(b)
      locationMap.set(b.location, {
        title: b.locationData.title,
        slots: slots.filter(s => s.id !== 'all-day'),
      })
    }
  })
  return Array.from(locationMap.entries()).map(([id, data]) => ({
    id,
    title: data.title,
    slots: data.slots,
  }))
})


// Location filter state - all locations enabled by default
const locationOverrides = ref<Record<string, boolean>>({})

const locationFilters = computed(() =>
  Object.fromEntries(
    availableLocations.value.map(loc => [
      loc.id,
      locationOverrides.value[loc.id] ?? true,
    ]),
  ),
)

function toggleLocation(locationId: string) {
  locationOverrides.value[locationId] = !locationFilters.value[locationId]
}

// Filtered bookings based on status AND location
const filteredBookings = computed(() => {
  if (!bookings.value) return []
  return bookings.value.filter((b) => {
    const s = b.status?.toLowerCase() as StatusKey
    const statusMatch = statusFilters.value[s] !== false
    const locationMatch = locationFilters.value[b.location] !== false
    return statusMatch && locationMatch
  })
})

// Calendar - selected date
const selectedDate = ref<Date | null>(null)

// Helper to get local date string (YYYY-MM-DD) from a Date
function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Get dates that have bookings for calendar highlighting (respects status filters)
function hasBookingOnDate(date: DateValue): boolean {
  if (!filteredBookings.value.length) return false
  const dateStr = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
  return filteredBookings.value.some((b) => {
    const bookingDate = new Date(b.date)
    const bookingStr = toLocalDateStr(bookingDate)
    return bookingStr === dateStr
  })
}

// When calendar date is selected, check if we need to expand the date range
watch(selectedDate, (newDate) => {
  if (!newDate) return
  // Check if we need to expand the date range
  if (!isDateInLoadedRange(newDate)) {
    expandDateRange(newDate)
  }
})

const hasBookings = computed(() => bookings.value && bookings.value.length > 0)

// Parse booking slot IDs helper
function parseBookingSlotIds(booking: Booking): string[] {
  if (!booking.slot) return []
  try {
    const slotIds = typeof booking.slot === 'string'
      ? JSON.parse(booking.slot)
      : booking.slot
    return Array.isArray(slotIds) ? slotIds : []
  }
  catch {
    return []
  }
}

// Get slot label from booking
function getSlotLabel(booking: Booking): string {
  const locationSlots = parseLocationSlots(booking)
  const bookingSlotIds = parseBookingSlotIds(booking)

  if (locationSlots.length === 0 || bookingSlotIds.length === 0) return '-'

  // Find matching slot
  const slot = locationSlots.find(s => bookingSlotIds.includes(s.id))
  return slot?.label || slot?.value || '-'
}

// Get slot position info for indicator
function getSlotPositionInfo(booking: Booking): { totalSlots: number, position: number, color?: string } | null {
  const locationSlots = parseLocationSlots(booking)
  const bookingSlotIds = parseBookingSlotIds(booking)

  if (locationSlots.length === 0 || bookingSlotIds.length === 0) return null

  // Find the position of the booked slot
  const position = locationSlots.findIndex(s => bookingSlotIds.includes(s.id))
  if (position === -1) return null

  return {
    totalSlots: locationSlots.length,
    position,
    color: locationSlots[position]?.color
  }
}

// Status badge color - lookup from hardcoded statuses
function getStatusColor(statusValue: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  const statusItem = statuses.find(s => s.value === statusValue?.toLowerCase())
  return statusItem?.color || 'neutral'
}

// Get group label from settings
function getGroupLabel(groupId: string | null | undefined): string | null {
  if (!groupId) return null
  const group = groupOptions.value.find(g => g.id === groupId)
  return group?.label || groupId
}

// Check if a booking should be highlighted
function isBookingHighlighted(bookingDate: string | Date): boolean {
  if (!selectedDate.value) return false
  const booking = new Date(bookingDate)
  const bookingStr = toLocalDateStr(booking)
  const selectedStr = toLocalDateStr(selectedDate.value)
  return bookingStr === selectedStr
}

// Refs for scroll sync
const scrollAreaRef = useTemplateRef<HTMLElement>('scrollAreaRef')
const bookingRefs = new Map<string, HTMLElement>()

// Convert selectedDate (Date | null) to CalendarDate for UCalendar
const selectedCalendarDate = computed({
  get: () => {
    if (!selectedDate.value) return undefined
    const d = selectedDate.value
    return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
  },
  set: (value: DateValue | undefined) => {
    if (!value) {
      selectedDate.value = null
    } else {
      selectedDate.value = value.toDate(getLocalTimeZone())
    }
  },
})

function setBookingRef(id: string, el: HTMLElement | null) {
  if (el) {
    bookingRefs.set(id, el)
  } else {
    bookingRefs.delete(id)
  }
}

// Responsive
const { width: windowWidth, height: windowHeight } = useWindowSize()
const numberOfMonths = computed(() => windowWidth.value < 768 ? 1 : 3)
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="status === 'pending'" class="text-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 text-muted animate-spin mx-auto mb-3" />
      <p class="text-muted">
        {{ t('bookings.list.loading') }}
      </p>
    </div>

    <!-- Empty state -->
<!--    <div v-else-if="!hasBookings" class="text-center py-12">-->
<!--      <UIcon name="i-lucide-calendar-x" class="w-16 h-16 text-muted mx-auto mb-4" />-->
<!--      <h3 class="text-lg font-medium mb-2">-->
<!--        {{ t('bookings.list.noBookings') }}-->
<!--      </h3>-->
<!--      <p class="text-muted mb-6">-->
<!--        {{ t('bookings.list.noBookingsDescription') }}-->
<!--      </p>-->
<!--    </div>-->

    <!-- Bookings list -->
    <div v-else class="space-y-4">
      <!-- Sticky Filter Bar + Calendar -->
      <div class="sticky top-0 z-20 bg-default py-2 space-y-2">
        <!-- Filter Bar - horizontal scroll on mobile -->
        <div class="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <!-- Status Toggles -->
          <div class="flex gap-1 shrink-0">
            <UButton
              v-for="statusItem in statuses"
              :key="statusItem.id"
              size="xs"
              :variant="statusFilters[statusItem.value] ? 'solid' : 'outline'"
              :color="statusItem.color"
              @click="toggleStatus(statusItem.value)"
            >
              <UIcon
                :name="statusFilters[statusItem.value] ? 'i-lucide-check' : 'i-lucide-x'"
                class="w-3 h-3"
              />
              {{ t('bookings.status.' + statusItem.value) }}
            </UButton>
          </div>

          <!-- Separator -->
          <USeparator v-if="availableLocations.length > 1" orientation="vertical" class="h-5 shrink-0" />

          <!-- Location Filters -->
          <div v-if="availableLocations.length > 1" class="flex gap-1 shrink-0">
            <button
              v-for="loc in availableLocations"
              :key="loc.id"
              type="button"
              class="px-2 py-1 rounded-md transition-all"
              :class="[
                locationFilters[loc.id]
                  ? 'bg-elevated shadow-sm'
                  : 'bg-elevated/30 opacity-50 hover:opacity-80'
              ]"
              @click="toggleLocation(loc.id)"
            >
              <span class="text-xs font-medium">{{ loc.title }}</span>
            </button>
          </div>

          <!-- Spacer -->
          <div class="flex-1 min-w-2" />

          <!-- Count -->
          <span class="text-xs text-muted whitespace-nowrap shrink-0">
            {{ filteredBookings.length }}/{{ bookings?.length }}
          </span>

          <!-- Refresh -->
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            icon="i-lucide-refresh-cw"
            @click="() => refresh()"
          />
        </div>

        <!-- Month Calendar View -->
        <div class="bg-elevated/50 rounded-lg p-2">
          <UCalendar
            v-model="selectedCalendarDate"
            :number-of-months="numberOfMonths"
            size="sm"
            class="w-full"
            :ui="{ root: 'w-full', header: 'justify-between', gridRow: 'grid grid-cols-7 mb-1' }"
          >
            <template #day="{ day }">
              <div class="flex flex-col items-center">
                <span>{{ day.day }}</span>
                <div
                  v-if="hasBookingOnDate(day)"
                  class="w-1.5 h-1.5 rounded-full bg-primary mt-0.5"
                />
              </div>
            </template>
          </UCalendar>
        </div>
      </div>

      <!-- Bookings List (scrollable container) -->
      <div
        ref="scrollAreaRef"
        class="px-2 space-y-2"
      >
        <div
          v-for="booking in filteredBookings"
          :key="booking.id"
          :ref="(el) => setBookingRef(booking.id, el as HTMLElement)"
          :data-booking-id="booking.id"
          :data-booking-date="toLocalDateStr(new Date(booking.date))"
        >
          <CroutonBookingBookingSidebarBookingItem
            :id="booking.id"
            :location-title="booking.locationData?.title || 'Unknown Location'"
            :slot-label="getSlotLabel(booking)"
            :slot-color="getSlotPositionInfo(booking)?.color"
            :date="booking.date"
            :group-label="getGroupLabel(booking.group)"
            :status="booking.status"
            :total-slots="getSlotPositionInfo(booking)?.totalSlots || 0"
            :slot-position="getSlotPositionInfo(booking)?.position ?? -1"
            :user-name="booking.ownerUser?.name || booking.createdByUser?.name"
            :user-avatar="booking.ownerUser?.avatarUrl || booking.createdByUser?.avatarUrl"
            :created-at="booking.createdAt"
            :email-stats="booking.emailStats"
            :highlighted="isBookingHighlighted(booking.date)"
            show-status
          />
        </div>

        <!-- Empty state when filtered -->
        <div v-if="filteredBookings.length === 0" class="text-center py-8">
          <UIcon name="i-lucide-filter-x" class="w-12 h-12 text-muted mx-auto mb-3" />
          <p class="text-sm text-muted">{{ t('bookings.list.noFilterMatch') }}</p>
          <UButton
            variant="link"
            size="sm"
            class="mt-2"
            @click="statusOverrides = {}; locationOverrides = {}"
          >
            {{ t('bookings.list.showAllBookings') }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
