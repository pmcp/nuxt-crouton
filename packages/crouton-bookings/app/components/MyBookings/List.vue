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

// Calendar - selected date and hovered date
const selectedDate = ref<Date | null>(null)
// Hovered date from calendar (for exact day highlighting)
const hoveredDate = ref<Date | null>(null)
// Suppress week highlighting after hover ends (until scroll resumes)
const suppressWeekHighlight = ref(false)
// Flag to prevent infinite loops during sync
const isSyncing = ref(false)
// Flag to prevent hover-initiated scroll from re-enabling week highlighting
const isHoverScroll = ref(false)

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

// Get bookings for a specific date (respects status filters)
function getBookingsForDate(date: DateValue): Booking[] {
  if (!filteredBookings.value.length) return []
  const dateStr = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
  return filteredBookings.value.filter((b) => {
    const bookingDate = new Date(b.date)
    const bookingStr = toLocalDateStr(bookingDate)
    return bookingStr === dateStr
  })
}

// Get unique locations with bookings for a specific date
interface LocationBooking {
  locationId: string
  locationTitle: string
  bookings: Booking[]
  slots: SlotItem[]
  bookedSlotIds: string[]
}

function getLocationBookingsForDate(date: DateValue): LocationBooking[] {
  const dateBookings = getBookingsForDate(date)
  if (dateBookings.length === 0) return []

  // Group bookings by location
  const locationMap = new Map<string, Booking[]>()
  dateBookings.forEach((b) => {
    const existing = locationMap.get(b.location) || []
    existing.push(b)
    locationMap.set(b.location, existing)
  })

  // Convert to array with slot data
  return Array.from(locationMap.entries()).map(([locationId, locBookings]) => {
    // Get slots from the first booking's location data (all bookings at same location have same slots)
    const locationSlots = locBookings[0] ? parseLocationSlots(locBookings[0]) : []
    // Collect all booked slot IDs from all bookings at this location
    const bookedIds: string[] = []
    locBookings.forEach((b) => {
      const ids = parseBookingSlotIds(b)
      bookedIds.push(...ids)
    })

    return {
      locationId,
      locationTitle: locBookings[0]?.locationData?.title || 'Unknown',
      bookings: locBookings,
      slots: locationSlots.filter(s => s.id !== 'all-day').map(s => ({
        id: s.id,
        label: s.label || s.value || s.id,
        color: s.color || '#94a3b8',
      })),
      bookedSlotIds: bookedIds,
    }
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
// When hovering: only exact date matches
// After hover ends: no highlights until scroll resumes
// When scrolling: all bookings in the selected week
function isBookingHighlighted(bookingDate: string | Date): boolean {
  const booking = new Date(bookingDate)
  const bookingStr = toLocalDateStr(booking)

  // If hovering, only highlight exact date match
  if (hoveredDate.value) {
    const hoveredStr = toLocalDateStr(hoveredDate.value)
    return bookingStr === hoveredStr
  }

  // After hover ends, suppress week highlighting until scroll resumes
  if (suppressWeekHighlight.value) return false

  // Otherwise, highlight by week (when scrolling)
  if (!selectedDate.value) return false
  const selected = selectedDate.value

  // Get start of week for both dates (Monday = start)
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day // Adjust for Monday start
    d.setDate(d.getDate() + diff)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }

  return getWeekStart(booking) === getWeekStart(selected)
}

// Scroll container ref (main scrollable area)
const scrollContainer = ref<HTMLElement | null>(null)

// Scroll to first booking on a specific date (positions at 40% of viewport)
function scrollToDateBooking(date: Date) {
  const dateStr = toLocalDateStr(date)
  const booking = filteredBookings.value.find((b) => {
    return toLocalDateStr(new Date(b.date)) === dateStr
  })

  if (booking && scrollContainer.value) {
    const el = bookingRefs.get(booking.id)
    if (el) {
      isSyncing.value = true
      isHoverScroll.value = true
      const rect = el.getBoundingClientRect()
      const targetY = windowHeight.value * 0.4
      const scrollOffset = rect.top - targetY + scrollContainer.value.scrollTop
      scrollContainer.value.scrollTo({ top: scrollOffset, behavior: 'smooth' })
      setTimeout(() => {
        isSyncing.value = false
      }, 500)
      // Keep isHoverScroll true longer to prevent residual scroll from re-enabling highlights
      setTimeout(() => {
        isHoverScroll.value = false
      }, 1000)
    }
  }
}

// Handle hover from week/month calendar (also scrolls to booking)
// hoveredDate persists after mouseleave - only cleared when user scrolls
function onDayHover(date: Date | null) {
  if (date) {
    hoveredDate.value = date
    suppressWeekHighlight.value = true
    scrollToDateBooking(date)
  }
  // Don't clear hoveredDate on mouseleave - keep highlight until scroll
}

// Find booking closest to 40% of viewport and sync calendar
function syncCalendarToScroll() {
  if (isSyncing.value) return

  // Trigger point at 40% of viewport height
  const triggerPoint = windowHeight.value * 0.4
  let closestDate: string | null = null
  let closestDistance = Infinity

  bookingRefs.forEach((el) => {
    const rect = el.getBoundingClientRect()
    const elementCenter = rect.top + rect.height / 2
    const distance = Math.abs(elementCenter - triggerPoint)

    if (distance < closestDistance) {
      closestDistance = distance
      closestDate = el.getAttribute('data-booking-date')
    }
  })

  if (closestDate) {
    // Parse YYYY-MM-DD as local date (not UTC)
    const [year, month, day] = closestDate.split('-').map(Number)
    const bookingDate = new Date(year!, month! - 1, day)
    isSyncing.value = true

    // Re-enable week highlighting only on user-initiated scroll (not hover scroll)
    if (!isHoverScroll.value) {
      suppressWeekHighlight.value = false
      hoveredDate.value = null // Clear day highlight, switch to week highlight
    }

    // Only update selectedDate if it's different (avoids loops)
    const newDateStr = toLocalDateStr(bookingDate)
    const currentDateStr = selectedDate.value ? toLocalDateStr(selectedDate.value) : ''
    if (newDateStr !== currentDateStr) {
      selectedDate.value = bookingDate

      // Sync the week calendar view if active (only when date actually changed)
      if (calendarViewMode.value === 'week' && weekCarousel.value) {
        (weekCarousel.value as any).scrollToDate?.(bookingDate)
      }
    }

    useTimeoutFn(() => {
      isSyncing.value = false
    }, 500)
  }
}

// Debounced scroll handler
const onBookingsScroll = useDebounceFn(syncCalendarToScroll, 150)

// Set up scroll listener on mount
onMounted(() => {
  scrollContainer.value = document.querySelector('.w-full.flex-1.overflow-y-auto')
})

// Use VueUse's useEventListener for automatic cleanup
useEventListener(scrollContainer, 'scroll', onBookingsScroll, { passive: true })

// Refs for scroll sync
const scrollAreaRef = useTemplateRef<HTMLElement>('scrollAreaRef')
const weekCarousel = useTemplateRef('weekCarousel')
const monthCalendar = useTemplateRef('monthCalendar')
const bookingRefs = new Map<string, HTMLElement>()

// Handle week change from carousel
function onWeekChange(weekStart: Date, weekEnd: Date) {
  if (isSyncing.value) return

  // Check if we need to expand the date range
  if (!isDateInLoadedRange(weekStart) || !isDateInLoadedRange(weekEnd)) {
    expandDateRange(weekStart)
  }

  // Clear any hover state - carousel navigation takes priority
  hoveredDate.value = null
  suppressWeekHighlight.value = false

  // Only update selectedDate if it's actually different (avoids loops)
  const newDateStr = toLocalDateStr(weekStart)
  const currentDateStr = selectedDate.value ? toLocalDateStr(selectedDate.value) : ''
  if (newDateStr !== currentDateStr) {
    selectedDate.value = weekStart
  }

  // Find first booking in this week and scroll to it
  const firstBooking = filteredBookings.value.find((booking) => {
    const bookingDate = new Date(booking.date)
    return bookingDate >= weekStart && bookingDate <= weekEnd
  })

  if (firstBooking && scrollAreaRef.value) {
    isSyncing.value = true
    const el = bookingRefs.get(firstBooking.id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setTimeout(() => {
      isSyncing.value = false
    }, 500)
  }
}

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
              <CroutonBookingLocationCardMini
                :title="loc.title"
                :slots="loc.slots"
              />
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

        <!-- Calendar View with Toggle -->
        <div class="bg-elevated/50 rounded-lg p-2">
          <!-- View Mode Toggle -->
          <div class="flex justify-end mb-2">
            <UFieldGroup size="xs">
              <UButton
                :variant="calendarViewMode === 'week' ? 'solid' : 'outline'"
                color="neutral"
                icon="i-lucide-calendar-days"
                @click="calendarViewMode = 'week'"
              />
              <UButton
                :variant="calendarViewMode === 'month' ? 'solid' : 'outline'"
                color="neutral"
                icon="i-lucide-calendar"
                @click="calendarViewMode = 'month'"
              />
            </UFieldGroup>
          </div>

          <!-- Week Calendar View -->
          <CroutonWeekCalendar
            v-if="calendarViewMode === 'week'"
            ref="weekCarousel"
            v-model="selectedDate"
            :initial-weeks="52"
            size="sm"
            @week-change="onWeekChange"
            @day-hover="onDayHover"
          >
            <template #day="{ date }">
              <div v-if="hasBookingOnDate(asDateValue(date))" class="flex flex-col gap-0.5">
                <CroutonBookingSlotIndicator
                  v-for="lb in getLocationBookingsForDate(asDateValue(date))"
                  :key="lb.locationId"
                  :slots="lb.slots"
                  :booked-slot-ids="lb.bookedSlotIds"
                  size="sm"
                />
              </div>
            </template>
          </CroutonWeekCalendar>

          <!-- Month Calendar View -->
          <div v-else>
            <UCalendar
              ref="monthCalendar"
              v-model="selectedCalendarDate"
              :number-of-months="numberOfMonths"
              size="sm"
              class="w-full"
              :ui="{ root: 'w-full', header: 'justify-between', gridRow: 'grid grid-cols-7 mb-1' }"
            >
              <template #day="{ day }">
                <div
                  class="flex flex-col items-center"
                  @mouseenter="onDayHover(day.toDate(getLocalTimeZone()))"
                >
                  <span>{{ day.day }}</span>
                  <div v-if="hasBookingOnDate(day)" class="flex flex-col gap-0.5 mt-0.5">
                    <CroutonBookingSlotIndicator
                      v-for="lb in getLocationBookingsForDate(day)"
                      :key="lb.locationId"
                      :slots="lb.slots"
                      :booked-slot-ids="lb.bookedSlotIds"
                      size="xs"
                    />
                  </div>
                </div>
              </template>
            </UCalendar>
          </div>
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
