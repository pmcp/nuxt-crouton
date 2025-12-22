<script setup lang="ts">
import type { DateValue, DateRange } from '@internationalized/date'
import { fromDate, toCalendarDate, getLocalTimeZone } from '@internationalized/date'

interface SlotItem {
  id: string
  label?: string
  value?: string
  color?: string
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
}

// Use shared data from composable (same cache key as tab count)
const {
  myBookings: bookings,
  myBookingsStatus: status,
  refreshMyBookings,
  activeTab,
  cancelBooking,
  deleteBooking,
  groupOptions,
} = useBookingCart()

const { t } = useI18n()

// Alias for template usage
const refresh = refreshMyBookings

// Track which booking is being cancelled (loading state)
const cancellingId = ref<string | null>(null)

// Track which booking is being deleted (loading state)
const deletingId = ref<string | null>(null)

// Track which booking has confirmation expanded
const confirmingId = ref<string | null>(null)

// Track which booking has delete confirmation expanded
const confirmingDeleteId = ref<string | null>(null)

// Show confirmation for a booking
function showConfirmation(bookingId: string) {
  confirmingId.value = bookingId
  confirmingDeleteId.value = null
}

// Show delete confirmation for a cancelled booking
function showDeleteConfirmation(bookingId: string) {
  confirmingDeleteId.value = bookingId
  confirmingId.value = null
}

// Hide confirmation
function hideConfirmation() {
  confirmingId.value = null
  confirmingDeleteId.value = null
}

// Confirm and cancel booking
async function confirmCancel(bookingId: string) {
  cancellingId.value = bookingId
  await cancelBooking(bookingId)
  cancellingId.value = null
  confirmingId.value = null
}

// Permanently delete a cancelled booking
async function confirmDelete(bookingId: string) {
  deletingId.value = bookingId
  await deleteBooking(bookingId)
  deletingId.value = null
  confirmingDeleteId.value = null
}

const hasBookings = computed(() => bookings.value && bookings.value.length > 0)

// Toggle to show cancelled bookings
const showCancelled = ref(false)

// Get upcoming bookings (future dates)
const upcomingBookings = computed(() => {
  if (!bookings.value) return []
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return (bookings.value as Booking[]).filter((b) => {
    const bookingDate = new Date(b.date)
    const isFuture = bookingDate >= now
    const includeCancelled = showCancelled.value || b.status !== 'cancelled'
    return isFuture && includeCancelled
  })
})

// Count of non-cancelled upcoming bookings (for display)
const activeUpcomingCount = computed(() => {
  if (!bookings.value) return 0
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return (bookings.value as Booking[]).filter((b) => {
    const bookingDate = new Date(b.date)
    return bookingDate >= now && b.status !== 'cancelled'
  }).length
})

// Format date for display
function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

// Get slot label from booking
function getSlotLabel(booking: Booking): string {
  if (!booking.slot || !booking.locationData?.slots) return '-'

  let locationSlots: SlotItem[]
  try {
    locationSlots = typeof booking.locationData.slots === 'string'
      ? JSON.parse(booking.locationData.slots)
      : booking.locationData.slots
  }
  catch {
    return '-'
  }

  if (!Array.isArray(locationSlots)) return '-'

  let bookingSlotIds: string[]
  try {
    bookingSlotIds = typeof booking.slot === 'string'
      ? JSON.parse(booking.slot)
      : booking.slot
  }
  catch {
    return '-'
  }

  if (!Array.isArray(bookingSlotIds) || bookingSlotIds.length === 0) return '-'

  // Check for all-day first
  if (bookingSlotIds.includes('all-day')) return t('bookings.slots.allDay')

  const slot = locationSlots.find(s => bookingSlotIds.includes(s.id))
  return slot?.label || slot?.value || '-'
}

function goToBooking() {
  activeTab.value = 'book'
}

// Get display status - past bookings that were pending/confirmed should show as "completed"
function getDisplayStatus(booking: Booking): string {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const bookingDate = new Date(booking.date)
  bookingDate.setHours(0, 0, 0, 0)
  const isPast = bookingDate < now

  if (isPast && (booking.status === 'pending' || booking.status === 'confirmed')) {
    return 'completed'
  }
  return booking.status
}

// Get group label from settings
function getGroupLabel(groupId: string | null | undefined): string | null {
  if (!groupId) return null
  const group = groupOptions.value.find(g => g.id === groupId)
  return group?.label || groupId
}

// Calendar filter state - supports date range
const selectedFilterRange = ref<{ start: Date | null, end: Date | null }>({ start: null, end: null })

// Check if a range is active (at least start date selected)
const hasActiveRange = computed(() => selectedFilterRange.value.start !== null)

// Convert DateValue to Date for helper functions
function dateValueToDate(dateValue: DateValue): Date {
  return dateValue.toDate(getLocalTimeZone())
}

// Get all bookings (including past) respecting showCancelled toggle
const allVisibleBookings = computed(() => {
  if (!bookings.value) return []
  return (bookings.value as Booking[]).filter((b) => {
    return showCancelled.value || b.status !== 'cancelled'
  })
})

// Get bookings for a specific date (for calendar dots) - shows ALL bookings
function getBookingsForDate(dateValue: DateValue): Booking[] {
  if (!allVisibleBookings.value) return []
  const targetDate = dateValueToDate(dateValue)
  targetDate.setHours(0, 0, 0, 0)

  return allVisibleBookings.value.filter((b) => {
    const bookingDate = new Date(b.date)
    bookingDate.setHours(0, 0, 0, 0)
    return bookingDate.getTime() === targetDate.getTime()
  })
}

// Check if date has bookings (for calendar indicators)
function hasBookingsOnDate(dateValue: DateValue): boolean {
  return getBookingsForDate(dateValue).length > 0
}

// Fallback colors for slots without a color set
const FALLBACK_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#14b8a6', '#a855f7', '#ef4444']
const DEFAULT_SLOT_COLOR = '#9ca3af'

// Get slot color for a booking
function getBookingSlotColor(booking: Booking): string {
  if (!booking.slot || !booking.locationData?.slots) return DEFAULT_SLOT_COLOR

  let locationSlots: SlotItem[]
  try {
    locationSlots = typeof booking.locationData.slots === 'string'
      ? JSON.parse(booking.locationData.slots)
      : booking.locationData.slots
  }
  catch {
    return DEFAULT_SLOT_COLOR
  }

  if (!Array.isArray(locationSlots)) return DEFAULT_SLOT_COLOR

  let bookingSlotIds: string[]
  try {
    bookingSlotIds = typeof booking.slot === 'string'
      ? JSON.parse(booking.slot)
      : booking.slot
  }
  catch {
    return DEFAULT_SLOT_COLOR
  }

  if (!Array.isArray(bookingSlotIds) || bookingSlotIds.length === 0) return DEFAULT_SLOT_COLOR

  // Find the slot and get its color
  const slot = locationSlots.find(s => bookingSlotIds.includes(s.id))
  if (slot?.color) return slot.color

  // Fallback color based on slot index
  const index = locationSlots.findIndex(s => bookingSlotIds.includes(s.id))
  if (index >= 0) {
    const color = FALLBACK_COLORS[index % FALLBACK_COLORS.length]
    return color ?? DEFAULT_SLOT_COLOR
  }

  return DEFAULT_SLOT_COLOR
}

// Get slot position info for a booking
function getSlotPositionInfo(booking: Booking): { totalSlots: number; position: number } | null {
  if (!booking.slot || !booking.locationData?.slots) return null

  let locationSlots: SlotItem[]
  try {
    locationSlots = typeof booking.locationData.slots === 'string'
      ? JSON.parse(booking.locationData.slots)
      : booking.locationData.slots
  }
  catch {
    return null
  }

  if (!Array.isArray(locationSlots) || locationSlots.length === 0) return null

  let bookingSlotIds: string[]
  try {
    bookingSlotIds = typeof booking.slot === 'string'
      ? JSON.parse(booking.slot)
      : booking.slot
  }
  catch {
    return null
  }

  if (!Array.isArray(bookingSlotIds) || bookingSlotIds.length === 0) return null

  const position = locationSlots.findIndex(s => bookingSlotIds.includes(s.id))
  if (position === -1) return null

  return {
    totalSlots: locationSlots.length,
    position,
  }
}

// Calendar range value - let calendar manage selection state
const calendarRangeValue = shallowRef<DateRange | undefined>(undefined)

// Sync filter state when calendar completes a range selection
watch(calendarRangeValue, (value) => {
  if (!value) {
    selectedFilterRange.value = { start: null, end: null }
  }
  else {
    selectedFilterRange.value = {
      start: value.start ? value.start.toDate(getLocalTimeZone()) : null,
      end: value.end ? value.end.toDate(getLocalTimeZone()) : null,
    }
  }
})

// Clear the date filter
function clearDateFilter() {
  calendarRangeValue.value = undefined
}

// Format date range for display
const filterRangeDisplay = computed(() => {
  if (!selectedFilterRange.value.start) return ''
  const start = formatDate(selectedFilterRange.value.start)
  if (!selectedFilterRange.value.end || selectedFilterRange.value.start.getTime() === selectedFilterRange.value.end.getTime()) {
    return start
  }
  const end = formatDate(selectedFilterRange.value.end)
  return `${start} – ${end}`
})

// Check if range spans multiple days (for display text)
const isMultiDayRange = computed(() => {
  if (!selectedFilterRange.value.start || !selectedFilterRange.value.end) return false
  return selectedFilterRange.value.start.getTime() !== selectedFilterRange.value.end.getTime()
})

// Get all slots for a location from a booking's locationData
function getLocationSlots(booking: Booking): SlotItem[] {
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

// Get booked slot IDs from bookings at a location
function getBookedSlotIds(locationBookings: Booking[]): string[] {
  const ids: string[] = []
  for (const booking of locationBookings) {
    try {
      const slotIds = typeof booking.slot === 'string'
        ? JSON.parse(booking.slot)
        : booking.slot
      if (Array.isArray(slotIds)) {
        ids.push(...slotIds)
      }
    }
    catch { /* ignore parse errors */ }
  }
  return ids
}

// Filter bookings by selected date range
// When no filter: show upcoming only
// When filter applied: show ALL bookings in that range (including past)
const filteredBookings = computed(() => {
  if (!hasActiveRange.value) return upcomingBookings.value

  const startDate = selectedFilterRange.value.start
  const endDate = selectedFilterRange.value.end || selectedFilterRange.value.start
  if (!startDate) return upcomingBookings.value

  const rangeStart = new Date(startDate)
  rangeStart.setHours(0, 0, 0, 0)

  const rangeEnd = new Date(endDate!)
  rangeEnd.setHours(23, 59, 59, 999)

  return allVisibleBookings.value.filter((b) => {
    const bookingDate = new Date(b.date)
    return bookingDate >= rangeStart && bookingDate <= rangeEnd
  })
})

// Group bookings by location for a date
function getBookingsByLocation(dateValue: DateValue): Map<string, Booking[]> {
  const dateBookings = getBookingsForDate(dateValue)
  const grouped = new Map<string, Booking[]>()

  for (const booking of dateBookings) {
    const locationId = booking.location
    if (!grouped.has(locationId)) {
      grouped.set(locationId, [])
    }
    grouped.get(locationId)!.push(booking)
  }

  return grouped
}
</script>

<template>
  <div class="w-full flex flex-col h-full min-h-0 overflow-hidden">
    <!-- Loading -->
    <div v-if="status === 'pending'" class="flex-1 flex flex-col items-center justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="w-6 h-6 text-muted animate-spin mb-2" />
      <p class="text-sm text-muted">
        {{ $t('common.loading') }}
      </p>
    </div>

    <!-- Empty state -->
    <div v-else-if="!hasBookings" class="flex-1 flex flex-col items-center justify-center text-center py-8">
      <UIcon name="i-lucide-calendar-x" class="w-12 h-12 text-muted mb-3" />
      <h3 class="text-sm font-medium mb-1">
        {{ $t('bookings.empty.title') }}
      </h3>
      <p class="text-xs text-muted mb-4">
        {{ $t('bookings.empty.description') }}
      </p>
      <UButton
        variant="soft"
        size="sm"
        icon="i-lucide-plus"
        @click="goToBooking"
      >
        {{ $t('bookings.buttons.bookNow') }}
      </UButton>
    </div>

    <!-- Bookings list -->
    <template v-else>
      <!-- Mini Calendar with booking indicators - range mode -->
      <UCalendar
        v-model="calendarRangeValue"
        range
        size="sm"
        class="mb-4 w-full"
        :ui="{ root: 'w-full', header: 'justify-between', gridRow: 'grid grid-cols-7 mb-1' }"
      >
        <template #day="{ day }">
          <div class="flex flex-col items-center">
            <span>{{ day.day }}</span>
            <div v-if="hasBookingsOnDate(day)" class="flex flex-col gap-0.5 mt-0.5">
              <template v-for="[locationId, locationBookings] in getBookingsByLocation(day)" :key="locationId">
                <div
                  v-if="locationBookings[0]"
                  class="w-1.5 h-1.5 rounded-full"
                  :style="{ backgroundColor: getBookingSlotColor(locationBookings[0]) }"
                />
              </template>
            </div>
          </div>
        </template>
      </UCalendar>

      <!-- Filter indicator -->
      <div
        v-if="hasActiveRange"
        class="mb-3 px-3 py-2 bg-primary/10 rounded-lg flex items-center justify-between gap-2"
      >
        <div class="flex items-center gap-2 text-sm text-primary">
          <UIcon name="i-lucide-filter" class="w-4 h-4" />
          <span>{{ filterRangeDisplay }}</span>
        </div>
        <UButton
          size="xs"
          variant="ghost"
          color="primary"
          icon="i-lucide-x"
          @click="clearDateFilter"
        />
      </div>

      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium">
          {{ hasActiveRange ? filteredBookings.length : activeUpcomingCount }} {{ hasActiveRange ? (isMultiDayRange ? $t('bookings.filter.inRange') : $t('bookings.filter.onDate')) : $t('bookings.filter.upcoming') }}
        </h3>
        <div class="flex items-center gap-2">
          <label class="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
            <USwitch v-model="showCancelled" size="xs" />
            <span>{{ $t('bookings.filter.cancelled') }}</span>
          </label>
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            icon="i-lucide-refresh-cw"
            @click="() => refresh()"
          />
        </div>
      </div>

      <!-- Items List -->
      <div class="flex-1 min-h-0 overflow-y-auto space-y-2">
        <BookingSidebarBookingItem
          v-for="booking in filteredBookings"
          :key="booking.id"
          :id="booking.id"
          :location-title="booking.locationData?.title || $t('bookings.list.unknownLocation')"
          :slot-label="getSlotLabel(booking)"
          :slot-color="getBookingSlotColor(booking)"
          :date="booking.date"
          :group-label="getGroupLabel(booking.group)"
          :status="getDisplayStatus(booking)"
          show-status
          :action-type="booking.status === 'cancelled' ? 'delete' : 'cancel'"
          :loading="cancellingId === booking.id || deletingId === booking.id"
          :show-confirmation="confirmingId === booking.id || confirmingDeleteId === booking.id"
          :total-slots="getSlotPositionInfo(booking)?.totalSlots || 0"
          :slot-position="getSlotPositionInfo(booking)?.position ?? -1"
          @show-confirmation="booking.status === 'cancelled' ? showDeleteConfirmation(booking.id) : showConfirmation(booking.id)"
          @hide-confirmation="hideConfirmation"
          @cancel="confirmCancel(booking.id)"
          @delete="confirmDelete(booking.id)"
        />

        <!-- Show message if no bookings match filter -->
        <div v-if="filteredBookings.length === 0" class="text-center py-4">
          <p class="text-xs text-muted">
            {{ hasActiveRange ? (isMultiDayRange ? $t('bookings.filter.noInRange') : $t('bookings.filter.noOnDate')) : $t('bookings.filter.noUpcoming') }}
          </p>
          <UButton
            variant="link"
            size="xs"
            class="mt-2"
            @click="hasActiveRange ? clearDateFilter() : goToBooking()"
          >
            {{ hasActiveRange ? $t('bookings.filter.clear') : $t('bookings.buttons.bookNew') }}
          </UButton>
        </div>
      </div>
    </template>
  </div>
</template>
