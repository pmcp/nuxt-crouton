<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { CalendarDate, getLocalTimeZone } from '@internationalized/date'
import type { DraftBooking, DisplayItem } from '../../composables/useMyBookingsList'

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
    color?: string | null
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

type StatusKey = 'active' | 'cancelled'

// Hardcoded statuses - labels come from translations
const STATUSES: StatusItem[] = [
  { id: '1', value: 'active', color: 'success' },
  { id: '2', value: 'cancelled', color: 'error' },
]

// Calendar view mode
type CalendarViewMode = 'week' | 'month'
const calendarViewMode = ref<CalendarViewMode>('week')

// Use the composable for state management
const {
  viewMode,
  isAdmin,
  draftBooking,
  isSaving,
  status,
  bookings,
  displayBookings,
  allLocations,
  enableGroups,
  groupOptions,
  isDateInLoadedRange,
  expandDateRange,
  createDraft,
  cancelDraft,
  saveDraft,
  getGroupLabel,
  toggleViewMode,
  refresh,
} = useMyBookingsList()

// Use hardcoded statuses
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

function toggleStatus(key: string) {
  statusOverrides.value[key] = !statusFilters.value[key]
}

// Get unique locations from bookings with their slots
interface LocationWithSlots {
  id: string
  title: string
  color?: string | null
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
  const locationMap = new Map<string, { title: string; color?: string | null; slots: SlotItem[] }>()
  bookings.value.forEach((b) => {
    if (b.location && b.locationData?.title && !locationMap.has(b.location)) {
      const slots = parseLocationSlots(b)
      locationMap.set(b.location, {
        title: b.locationData.title,
        color: b.locationData.color,
        slots: slots.filter(s => s.id !== 'all-day'),
      })
    }
  })
  return Array.from(locationMap.entries()).map(([id, data]) => ({
    id,
    title: data.title,
    color: data.color,
    slots: data.slots,
  }))
})

// Location filter state
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

// Combined display list with draft, filtered
const filteredDisplayBookings = computed<DisplayItem[]>(() => {
  const items: DisplayItem[] = []

  for (const item of displayBookings.value) {
    if ('isDraft' in item && item.isDraft) {
      // Always include draft
      items.push(item)
    }
    else {
      // Apply filters to regular bookings
      const booking = item as Booking
      const s = booking.status?.toLowerCase() as StatusKey
      const statusMatch = statusFilters.value[s] !== false
      const locationMatch = locationFilters.value[booking.location] !== false
      if (statusMatch && locationMatch) {
        items.push(item)
      }
    }
  }

  return items
})

// Calendar state
const selectedDate = ref<Date | null>(null)
const hoveredDate = ref<Date | null>(null)
const suppressWeekHighlight = ref(false)
const isSyncing = ref(false)
const isHoverScroll = ref(false)

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Get bookings for a specific date
function getBookingsForDate(date: DateValue): Booking[] {
  if (!filteredBookings.value.length) return []
  const dateStr = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
  return filteredBookings.value.filter((b) => {
    const bookingDate = new Date(b.date)
    const bookingStr = toLocalDateStr(bookingDate)
    return bookingStr === dateStr
  })
}

// Get ALL locations with slot status for calendar indicators
interface LocationSlotInfo {
  locationId: string
  locationTitle: string
  locationColor: string
  allSlots: SlotItem[]
  bookedSlotIds: string[]
}

function getLocationSlotsForDate(date: DateValue): LocationSlotInfo[] {
  // Get all enabled locations
  const enabledLocations = availableLocations.value.filter(
    loc => locationFilters.value[loc.id] !== false,
  )

  if (enabledLocations.length === 0) return []

  const dateStr = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`

  return enabledLocations.map((loc) => {
    // Find bookings for this location on this date
    const locBookings = filteredBookings.value.filter((b) => {
      if (b.location !== loc.id) return false
      const bookingDate = new Date(b.date)
      return toLocalDateStr(bookingDate) === dateStr
    })

    // Collect all booked slot IDs
    const bookedIds: string[] = []
    locBookings.forEach((b) => {
      const ids = parseBookingSlotIds(b)
      bookedIds.push(...ids)
    })

    return {
      locationId: loc.id,
      locationTitle: loc.title,
      locationColor: loc.color || '#3b82f6',
      allSlots: loc.slots.map(s => ({
        id: s.id,
        label: s.label || s.value || s.id,
        color: s.color || loc.color || '#94a3b8',
      })),
      bookedSlotIds: bookedIds,
    }
  })
}

// Expand range when calendar date selected
watch(selectedDate, (newDate) => {
  if (!newDate) return
  if (!isDateInLoadedRange(newDate)) {
    expandDateRange(newDate)
  }
})

// Parse booking slot IDs
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

function getSlotLabel(booking: Booking): string {
  const locationSlots = parseLocationSlots(booking)
  const bookingSlotIds = parseBookingSlotIds(booking)
  if (locationSlots.length === 0 || bookingSlotIds.length === 0) return '-'
  const slot = locationSlots.find(s => bookingSlotIds.includes(s.id))
  return slot?.label || slot?.value || '-'
}

function getSlotPositionInfo(booking: Booking): { totalSlots: number; position: number; color?: string } | null {
  const locationSlots = parseLocationSlots(booking)
  const bookingSlotIds = parseBookingSlotIds(booking)
  if (locationSlots.length === 0 || bookingSlotIds.length === 0) return null
  const position = locationSlots.findIndex(s => bookingSlotIds.includes(s.id))
  if (position === -1) return null
  return {
    totalSlots: locationSlots.length,
    position,
    color: booking.locationData?.color || undefined,
  }
}

function isBookingHighlighted(bookingDate: string | Date): boolean {
  const booking = new Date(bookingDate)
  const bookingStr = toLocalDateStr(booking)

  if (hoveredDate.value) {
    const hoveredStr = toLocalDateStr(hoveredDate.value)
    return bookingStr === hoveredStr
  }

  if (suppressWeekHighlight.value) return false
  if (!selectedDate.value) return false

  const selected = selectedDate.value
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }

  return getWeekStart(booking) === getWeekStart(selected)
}

// Refs
const scrollAreaRef = useTemplateRef<{ $el: HTMLElement }>('scrollAreaRef')
const weekCarousel = useTemplateRef('weekCarousel')
const bookingRefs = new Map<string, HTMLElement>()

const { height: windowHeight, width: windowWidth } = useWindowSize()
const numberOfMonths = computed(() => windowWidth.value < 768 ? 1 : 3)

function scrollToDateBooking(date: Date) {
  const dateStr = toLocalDateStr(date)
  const booking = filteredBookings.value.find((b) => {
    return toLocalDateStr(new Date(b.date)) === dateStr
  })

  if (booking) {
    const el = bookingRefs.get(booking.id)
    if (el) {
      isSyncing.value = true
      isHoverScroll.value = true
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => {
        isSyncing.value = false
      }, 500)
      setTimeout(() => {
        isHoverScroll.value = false
      }, 1000)
    }
  }
}

function onDayHover(date: Date | null) {
  if (date) {
    hoveredDate.value = date
    suppressWeekHighlight.value = true
    scrollToDateBooking(date)
  }
}

function onDayClick(date: Date) {
  // If already have a draft, scroll to it
  if (draftBooking.value) {
    const draftEl = bookingRefs.get(draftBooking.value.id)
    if (draftEl) {
      draftEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    return
  }

  // Create a new draft for this date
  const draft = createDraft(date)

  // Scroll to the draft after it's added
  nextTick(() => {
    const draftEl = bookingRefs.get(draft.id)
    if (draftEl) {
      draftEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

function syncCalendarToScroll() {
  if (isSyncing.value) return

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
    const [year, month, day] = closestDate.split('-').map(Number)
    const bookingDate = new Date(year!, month! - 1, day)
    isSyncing.value = true

    if (!isHoverScroll.value) {
      suppressWeekHighlight.value = false
      hoveredDate.value = null
    }

    const newDateStr = toLocalDateStr(bookingDate)
    const currentDateStr = selectedDate.value ? toLocalDateStr(selectedDate.value) : ''
    if (newDateStr !== currentDateStr) {
      selectedDate.value = bookingDate

      if (calendarViewMode.value === 'week' && weekCarousel.value) {
        (weekCarousel.value as any).scrollToDate?.(bookingDate)
      }
    }

    useTimeoutFn(() => {
      isSyncing.value = false
    }, 500)
  }
}

const onBookingsScroll = useDebounceFn(syncCalendarToScroll, 150)

function onWeekChange(weekStart: Date, weekEnd: Date) {
  if (isSyncing.value) return

  if (!isDateInLoadedRange(weekStart) || !isDateInLoadedRange(weekEnd)) {
    expandDateRange(weekStart)
  }

  hoveredDate.value = null
  suppressWeekHighlight.value = false

  const newDateStr = toLocalDateStr(weekStart)
  const currentDateStr = selectedDate.value ? toLocalDateStr(selectedDate.value) : ''
  if (newDateStr !== currentDateStr) {
    selectedDate.value = weekStart
  }

  const firstBooking = filteredBookings.value.find((booking) => {
    const bookingDate = new Date(booking.date)
    return bookingDate >= weekStart && bookingDate <= weekEnd
  })

  if (firstBooking) {
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

const selectedCalendarDate = computed({
  get: () => {
    if (!selectedDate.value) return undefined
    const d = selectedDate.value
    return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
  },
  set: (value: DateValue | undefined) => {
    if (!value) {
      selectedDate.value = null
    }
    else {
      selectedDate.value = value.toDate(getLocalTimeZone())
    }
  },
})

function setBookingRef(id: string, el: HTMLElement | null) {
  if (el) {
    bookingRefs.set(id, el)
  }
  else {
    bookingRefs.delete(id)
  }
}

function isDraftItem(item: DisplayItem): item is DraftBooking {
  return 'isDraft' in item && item.isDraft === true
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Loading -->
    <div v-if="status === 'pending'" class="text-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 text-muted animate-spin mx-auto mb-3" />
      <p class="text-muted">
        {{ t('bookings.list.loading') }}
      </p>
    </div>

    <template v-else>
      <!-- Sticky Filter Bar + Calendar -->
      <div class="sticky top-0 z-20 bg-default py-2 space-y-2">
        <!-- Filter Bar -->
        <div class="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <!-- View Mode Toggle (Admin only) -->
          <div v-if="isAdmin" class="flex gap-1 shrink-0">
            <UButton
              size="xs"
              :variant="viewMode === 'personal' ? 'solid' : 'outline'"
              color="neutral"
              @click="viewMode === 'team' && toggleViewMode()"
            >
              <UIcon name="i-lucide-user" class="w-3 h-3" />
              {{ t('bookings.list.myBookings') || 'My Bookings' }}
            </UButton>
            <UButton
              size="xs"
              :variant="viewMode === 'team' ? 'solid' : 'outline'"
              color="neutral"
              @click="viewMode === 'personal' && toggleViewMode()"
            >
              <UIcon name="i-lucide-users" class="w-3 h-3" />
              {{ t('bookings.list.allTeam') || 'All Team' }}
            </UButton>
          </div>

          <USeparator v-if="isAdmin" orientation="vertical" class="h-5 shrink-0" />

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
                  : 'bg-elevated/30 opacity-50 hover:opacity-80',
              ]"
              @click="toggleLocation(loc.id)"
            >
              <CroutonBookingLocationCardMini
                :title="loc.title"
                :slots="loc.slots"
              />
            </button>
          </div>

          <div class="flex-1 min-w-2" />

          <span class="text-xs text-muted whitespace-nowrap shrink-0">
            {{ filteredBookings.length }}/{{ bookings?.length }}
          </span>

          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            icon="i-lucide-refresh-cw"
            @click="() => refresh()"
          />
        </div>

        <!-- Calendar -->
        <div class="bg-elevated/50 rounded-lg p-2">
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

          <!-- Week Calendar -->
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
              <div
                class="flex flex-col gap-0.5 cursor-pointer min-h-[12px]"
                @click.stop="onDayClick(asDateValue(date).toDate(getLocalTimeZone()))"
              >
                <CroutonBookingSlotIndicator
                  v-for="lb in getLocationSlotsForDate(asDateValue(date))"
                  :key="lb.locationId"
                  :slots="lb.allSlots"
                  :booked-slot-ids="lb.bookedSlotIds"
                  :color="lb.locationColor"
                  size="sm"
                />
              </div>
            </template>
          </CroutonWeekCalendar>

          <!-- Month Calendar -->
          <div v-else>
            <UCalendar
              v-model="selectedCalendarDate"
              :number-of-months="numberOfMonths"
              size="sm"
              class="w-full"
              :ui="{ root: 'w-full', header: 'justify-between', gridRow: 'grid grid-cols-7 mb-1' }"
            >
              <template #day="{ day }">
                <div
                  class="flex flex-col items-center cursor-pointer"
                  @mouseenter="onDayHover(day.toDate(getLocalTimeZone()))"
                  @click="onDayClick(day.toDate(getLocalTimeZone()))"
                >
                  <span>{{ day.day }}</span>
                  <div v-if="getLocationSlotsForDate(day).some(lb => lb.allSlots.length > 0)" class="flex flex-col gap-0.5 mt-0.5">
                    <CroutonBookingSlotIndicator
                      v-for="lb in getLocationSlotsForDate(day)"
                      :key="lb.locationId"
                      :slots="lb.allSlots"
                      :booked-slot-ids="lb.bookedSlotIds"
                      :color="lb.locationColor"
                      size="xs"
                    />
                  </div>
                </div>
              </template>
            </UCalendar>
          </div>
        </div>
      </div>

      <!-- Bookings List with UScrollArea -->
      <UScrollArea
        ref="scrollAreaRef"
        class="flex-1"
        :ui="{ viewport: 'px-2 py-2 space-y-2' }"
        @scroll="onBookingsScroll"
      >
        <template v-for="item in filteredDisplayBookings" :key="item.id">
          <!-- Draft Booking (Edit Mode) -->
          <div
            v-if="isDraftItem(item)"
            :ref="(el) => setBookingRef(item.id, el as HTMLElement)"
            :data-booking-id="item.id"
            :data-booking-date="toLocalDateStr(item.date)"
          >
            <CroutonBookingMyBookingsBookingItemEdit
              :draft="item"
              :locations="allLocations || []"
              :enable-groups="enableGroups"
              :group-options="groupOptions"
              :is-saving="isSaving"
              @save="saveDraft"
              @cancel="cancelDraft"
            />
          </div>

          <!-- Regular Booking -->
          <div
            v-else
            :ref="(el) => setBookingRef(item.id, el as HTMLElement)"
            :data-booking-id="item.id"
            :data-booking-date="toLocalDateStr(new Date((item as Booking).date))"
          >
            <CroutonBookingBookingSidebarBookingItem
              :id="item.id"
              :location-title="(item as Booking).locationData?.title || 'Unknown Location'"
              :slot-label="getSlotLabel(item as Booking)"
              :slot-color="getSlotPositionInfo(item as Booking)?.color"
              :date="(item as Booking).date"
              :group-label="getGroupLabel((item as Booking).group || '')"
              :status="(item as Booking).status"
              :total-slots="getSlotPositionInfo(item as Booking)?.totalSlots || 0"
              :slot-position="getSlotPositionInfo(item as Booking)?.position ?? -1"
              :user-name="(item as Booking).ownerUser?.name || (item as Booking).createdByUser?.name"
              :user-avatar="(item as Booking).ownerUser?.avatarUrl || (item as Booking).createdByUser?.avatarUrl"
              :created-at="(item as Booking).createdAt"
              :email-stats="(item as Booking).emailStats"
              :highlighted="isBookingHighlighted((item as Booking).date)"
              show-status
            />
          </div>
        </template>

        <!-- Empty state -->
        <div v-if="filteredDisplayBookings.length === 0" class="text-center py-8">
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
      </UScrollArea>
    </template>
  </div>
</template>
