<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted, type ComponentPublicInstance } from 'vue'
import type { Booking } from '../types/booking'

interface Props {
  /** Bookings to display. If not provided, will fetch using useBookingsList */
  bookings?: Booking[]
  /** Loading state. If not provided, will use internal state */
  loading?: boolean
  /** Error state. If not provided, will use internal state */
  error?: Error | null
  /** Empty state message */
  emptyMessage?: string
  /** Whether filters are active (changes empty state message) */
  hasActiveFilters?: boolean
  /** Date to highlight (from calendar hover) */
  highlightedDate?: Date | null
  /** Date where inline creation card should appear */
  creatingAtDate?: Date | null
  /** Date to scroll to (after booking creation) */
  scrollToDate?: Date | null
  /** Active location filter - when set, only these locations are selectable in create form */
  activeLocationFilter?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  bookings: undefined,
  loading: undefined,
  error: undefined,
  emptyMessage: 'Your bookings will appear here',
  hasActiveFilters: false,
  highlightedDate: null,
  creatingAtDate: null,
  scrollToDate: null,
  activeLocationFilter: undefined,
})

const emit = defineEmits<{
  created: []
  cancelCreate: []
  /** Emitted when the top visible date changes (week changed during scroll) */
  topVisibleDateChange: [date: Date]
  /** Emitted when clicking on a booking's date visualization */
  dateClick: [date: Date]
}>()

// Use composable for fetching if bookings not provided
const listData = props.bookings === undefined ? useBookingsList() : null

// Resolved values - use props if provided, otherwise use composable
const resolvedBookings = computed(() => {
  return props.bookings ?? listData?.bookings.value ?? []
})

const resolvedLoading = computed(() => {
  return props.loading ?? listData?.loading.value ?? false
})

const resolvedError = computed(() => {
  return props.error ?? listData?.error.value ?? null
})

// Refresh function (only available when using composable)
function handleRefresh() {
  listData?.refresh()
}

// Container ref for scrolling
const listContainerRef = ref<HTMLElement | null>(null)

// Map of date keys to element refs for scroll targeting
const dateElementRefs = ref<Map<string, HTMLElement>>(new Map())

// Format date as YYYY-MM-DD for map key
function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Group bookings by month/year for separators, with date subgroups for scrolling
interface DateGroup {
  dateKey: string
  date: Date
  bookings: Booking[]
  isCreatePlaceholder?: boolean
}

interface MonthGroup {
  key: string
  label: string
  dateGroups: DateGroup[]
}

const groupedBookings = computed((): MonthGroup[] => {
  const monthGroups: MonthGroup[] = []
  let currentMonthKey = ''

  for (const booking of resolvedBookings.value) {
    const date = new Date(booking.date)
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`
    const dateKey = formatDateKey(date)
    const monthLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date)

    // Find or create month group
    if (monthKey !== currentMonthKey) {
      currentMonthKey = monthKey
      monthGroups.push({ key: monthKey, label: monthLabel, dateGroups: [] })
    }

    const currentMonth = monthGroups[monthGroups.length - 1]

    // Find or create date group within month
    let dateGroup = currentMonth.dateGroups.find(dg => dg.dateKey === dateKey)
    if (!dateGroup) {
      dateGroup = { dateKey, date: new Date(date), bookings: [] }
      currentMonth.dateGroups.push(dateGroup)
    }

    dateGroup.bookings.push(booking)
  }

  return monthGroups
})

// Extended grouped bookings that includes the creation date placeholder in the correct position
const groupedBookingsWithCreateDate = computed((): MonthGroup[] => {
  const baseGroups = groupedBookings.value

  // If not creating or already has bookings on that date, return as-is
  if (!props.creatingAtDate || creatingDateHasBookings.value) {
    return baseGroups
  }

  // Create a deep copy to avoid mutating the original
  const result: MonthGroup[] = JSON.parse(JSON.stringify(baseGroups))

  const createDate = props.creatingAtDate
  const createMonthKey = `${createDate.getFullYear()}-${createDate.getMonth()}`
  const createDateKey = formatDateKey(createDate)
  const createMonthLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(createDate)

  // Find or create the month group for the creation date
  let monthIndex = result.findIndex(mg => mg.key === createMonthKey)

  if (monthIndex === -1) {
    // Need to insert a new month group in the correct position
    const newMonthGroup: MonthGroup = {
      key: createMonthKey,
      label: createMonthLabel,
      dateGroups: [{
        dateKey: createDateKey,
        date: new Date(createDate),
        bookings: [],
        isCreatePlaceholder: true,
      }],
    }

    // Find correct position (sorted by date)
    const createTime = createDate.getTime()
    let insertIndex = result.length // default to end

    for (let i = 0; i < result.length; i++) {
      const firstDateInMonth = result[i].dateGroups[0]?.date
      if (firstDateInMonth && new Date(firstDateInMonth).getTime() > createTime) {
        insertIndex = i
        break
      }
    }

    result.splice(insertIndex, 0, newMonthGroup)
  }
  else {
    // Month exists, insert the date group in the correct position
    const monthGroup = result[monthIndex]
    const createTime = createDate.getTime()

    // Find correct position within the month (sorted by date)
    let insertIndex = monthGroup.dateGroups.length // default to end

    for (let i = 0; i < monthGroup.dateGroups.length; i++) {
      const dateGroupTime = new Date(monthGroup.dateGroups[i].date).getTime()
      if (dateGroupTime > createTime) {
        insertIndex = i
        break
      }
    }

    monthGroup.dateGroups.splice(insertIndex, 0, {
      dateKey: createDateKey,
      date: new Date(createDate),
      bookings: [],
      isCreatePlaceholder: true,
    })
  }

  return result
})

// Get all unique date keys for scroll targeting
const allDateKeys = computed(() => {
  const keys: string[] = []
  for (const monthGroup of groupedBookings.value) {
    for (const dateGroup of monthGroup.dateGroups) {
      keys.push(dateGroup.dateKey)
    }
  }
  return keys
})

// Find the nearest date key to scroll to (for dates without bookings)
function findNearestDateKey(targetDate: Date): string | null {
  const targetKey = formatDateKey(targetDate)
  const keys = allDateKeys.value

  if (keys.length === 0) return null
  if (keys.includes(targetKey)) return targetKey

  // Find nearest date
  const targetTime = targetDate.getTime()
  let nearestKey = keys[0]
  let nearestDiff = Infinity

  for (const key of keys) {
    const [year, month, day] = key.split('-').map(Number)
    const keyDate = new Date(year, month - 1, day)
    const diff = Math.abs(keyDate.getTime() - targetTime)

    if (diff < nearestDiff) {
      nearestDiff = diff
      nearestKey = key
    }
  }

  return nearestKey
}

// Track top visible date for calendar sync
const lastEmittedWeek = ref<string | null>(null)
const observer = ref<IntersectionObserver | null>(null)

// Get ISO week key to detect week changes
function getWeekKey(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${weekNum}`
}

// IntersectionObserver callback to find top visible date group
function observerCallback(entries: IntersectionObserverEntry[]) {
  // Find topmost visible date group
  let topEntry: IntersectionObserverEntry | null = null
  let topY = Infinity

  for (const entry of entries) {
    if (entry.isIntersecting && entry.boundingClientRect.top < topY && entry.boundingClientRect.top >= 0) {
      topY = entry.boundingClientRect.top
      topEntry = entry
    }
  }

  if (topEntry) {
    const dateKey = topEntry.target.getAttribute('data-date-key')
    if (dateKey) {
      const [year, month, day] = dateKey.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      const weekKey = getWeekKey(date)

      // Only emit if week changed
      if (weekKey !== lastEmittedWeek.value) {
        lastEmittedWeek.value = weekKey
        emit('topVisibleDateChange', date)
      }
    }
  }
}

// Register element ref for a date and observe for scroll tracking
function setDateRef(dateKey: string, el: HTMLElement | null) {
  if (el) {
    dateElementRefs.value.set(dateKey, el)
    el.setAttribute('data-date-key', dateKey)
    observer.value?.observe(el)
  } else {
    const existing = dateElementRefs.value.get(dateKey)
    if (existing) {
      observer.value?.unobserve(existing)
    }
    dateElementRefs.value.delete(dateKey)
  }
}

// Set up IntersectionObserver on mount
onMounted(() => {
  observer.value = new IntersectionObserver(observerCallback, {
    rootMargin: '-10% 0px -80% 0px', // Top 10-20% of viewport triggers
    threshold: 0,
  })

  // Observe any already-registered elements
  for (const el of dateElementRefs.value.values()) {
    observer.value.observe(el)
  }
})

// Clean up observer on unmount
onUnmounted(() => {
  observer.value?.disconnect()
})

// Handle click on booking date - emit to navigate calendar
function onBookingDateClick(date: Date) {
  emit('dateClick', date)
}

// Watch for highlighted date changes and scroll
watch(
  () => props.highlightedDate,
  (newDate) => {
    if (!newDate) return

    // Only scroll if there are bookings on the exact date (not nearest)
    const targetKey = formatDateKey(newDate)
    if (!allDateKeys.value.includes(targetKey)) return

    const element = dateElementRefs.value.get(targetKey)
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  },
)

// Watch for scrollToDate changes (after booking creation)
watch(
  () => props.scrollToDate,
  (newDate) => {
    if (!newDate) return

    // Wait for DOM to update with new booking
    nextTick(() => {
      const targetKey = formatDateKey(newDate)
      const element = dateElementRefs.value.get(targetKey)
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }
    })
  },
)

// Check if a booking should be highlighted
function isHighlighted(booking: Booking): boolean {
  if (!props.highlightedDate) return false
  const bookingDate = new Date(booking.date)
  return (
    bookingDate.getFullYear() === props.highlightedDate.getFullYear()
    && bookingDate.getMonth() === props.highlightedDate.getMonth()
    && bookingDate.getDate() === props.highlightedDate.getDate()
  )
}

// Creation date key for positioning the inline create card
const creatingAtDateKey = computed(() => {
  if (!props.creatingAtDate) return null
  return formatDateKey(props.creatingAtDate)
})

// Check if creating at date is in an existing date group
const creatingDateHasBookings = computed(() => {
  if (!creatingAtDateKey.value) return false
  return allDateKeys.value.includes(creatingAtDateKey.value)
})

// Ref for the create card element - use callback ref to handle multiple conditional refs
const createCardElement = ref<HTMLElement | null>(null)

// Callback ref setter - ensures we always get the element, not an array
function setCreateCardRef(el: Element | ComponentPublicInstance | null) {
  // Handle Vue component instances (get $el) or plain HTML elements
  if (el && '$el' in el) {
    createCardElement.value = el.$el as HTMLElement
  } else {
    createCardElement.value = el as HTMLElement | null
  }
}

// Scroll to create card when it appears
watch(
  () => props.creatingAtDate,
  (newDate) => {
    if (!newDate) return

    // Scroll to the create card
    nextTick(() => {
      const el = createCardElement.value
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }
    })
  },
)
</script>

<template>
  <div class="space-y-4">
    <!-- Loading state -->
    <div v-if="resolvedLoading" class="flex flex-col gap-3">
      <div v-for="i in 5" :key="i" class="bg-elevated/50 rounded-lg p-3 animate-pulse">
        <div class="flex items-center gap-3">
          <div class="w-16 h-16 bg-elevated rounded-lg" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-elevated rounded w-1/3" />
            <div class="h-3 bg-elevated rounded w-1/4" />
          </div>
          <div class="h-6 bg-elevated rounded w-16" />
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="resolvedError" class="bg-error/10 border border-error/20 rounded-lg p-6 text-center">
      <UIcon name="i-lucide-alert-circle" class="w-8 h-8 text-error mx-auto mb-2" />
      <p class="text-sm text-error font-medium">Failed to load bookings</p>
      <p class="text-xs text-muted mt-1">{{ resolvedError.message || 'An error occurred' }}</p>
      <UButton
        v-if="listData"
        variant="soft"
        color="error"
        size="sm"
        class="mt-3"
        @click="handleRefresh"
      >
        Try Again
      </UButton>
    </div>

    <!-- Empty state (but might have create card) -->
    <div v-else-if="resolvedBookings.length === 0">
      <!-- Inline create card when empty -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 scale-95 -translate-y-2"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div v-if="creatingAtDate" :ref="setCreateCardRef" class="scroll-mt-4">
          <CroutonBookingsBookingCreateCard
            :date="creatingAtDate"
            :active-location-filter="activeLocationFilter"
            @created="emit('created')"
            @cancel="emit('cancelCreate')"
          />
        </div>
      </Transition>

      <!-- Empty message when not creating -->
      <div v-else class="bg-elevated/50 rounded-lg p-8 text-center">
        <UIcon
          :name="hasActiveFilters ? 'i-lucide-filter-x' : 'i-lucide-calendar-x'"
          class="w-12 h-12 text-muted mx-auto mb-3"
        />
        <p class="text-sm font-medium">
          {{ hasActiveFilters ? 'No matching bookings' : 'No bookings yet' }}
        </p>
        <p class="text-xs text-muted mt-1">
          {{ hasActiveFilters ? 'Try adjusting your filters' : emptyMessage }}
        </p>
      </div>
    </div>

    <!-- Bookings list with month/year separators -->
    <div v-else ref="listContainerRef" class="flex flex-col gap-4">
      <div v-for="monthGroup in groupedBookingsWithCreateDate" :key="monthGroup.key" class="flex flex-col gap-2">
        <!-- Month/Year separator -->
        <div class="flex items-center gap-2 py-1 sticky top-0 bg-default/95 backdrop-blur-sm z-10">
          <span class="text-xs font-medium text-muted uppercase tracking-wider">
            {{ monthGroup.label }}
          </span>
          <div class="flex-1 h-px bg-muted/20" />
        </div>

        <!-- Date groups within month -->
        <div
          v-for="dateGroup in monthGroup.dateGroups"
          :key="dateGroup.dateKey"
          :ref="(el) => setDateRef(dateGroup.dateKey, el as HTMLElement)"
          class="flex flex-col gap-1.5 scroll-mt-4"
        >
          <!-- Create card for placeholder date (new date with no bookings) -->
          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 scale-95 -translate-y-2"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="dateGroup.isCreatePlaceholder && creatingAtDate"
              :ref="setCreateCardRef"
              class="scroll-mt-4"
            >
              <CroutonBookingsBookingCreateCard
                :date="creatingAtDate"
                :active-location-filter="activeLocationFilter"
                @created="emit('created')"
                @cancel="emit('cancelCreate')"
              />
            </div>
          </Transition>

          <!-- Bookings for this date -->
          <template v-else>
            <!-- Inline create card at TOP if creating at this date (existing date with bookings) -->
            <Transition
              enter-active-class="transition-all duration-300 ease-out"
              enter-from-class="opacity-0 scale-95 -translate-y-2"
              enter-to-class="opacity-100 scale-100 translate-y-0"
              leave-active-class="transition-all duration-200 ease-in"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <div
                v-if="creatingAtDateKey === dateGroup.dateKey"
                :ref="setCreateCardRef"
                class="scroll-mt-4"
              >
                <CroutonBookingsBookingCreateCard
                  :date="creatingAtDate!"
                  :active-location-filter="activeLocationFilter"
                  @created="emit('created')"
                  @cancel="emit('cancelCreate')"
                />
              </div>
            </Transition>

            <CroutonBookingsBookingCard
              v-for="booking in dateGroup.bookings"
              :key="booking.id"
              :booking="booking"
              :highlighted="isHighlighted(booking)"
              @date-click="onBookingDateClick"
            />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
