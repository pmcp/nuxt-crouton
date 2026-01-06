<script setup lang="ts">
import { ref, computed, watch, nextTick, type ComponentPublicInstance } from 'vue'
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
}

const props = withDefaults(defineProps<Props>(), {
  bookings: undefined,
  loading: undefined,
  error: undefined,
  emptyMessage: 'Your bookings will appear here',
  hasActiveFilters: false,
  highlightedDate: null,
  creatingAtDate: null,
})

const emit = defineEmits<{
  created: []
  cancelCreate: []
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

// Register element ref for a date
function setDateRef(dateKey: string, el: HTMLElement | null) {
  if (el) {
    dateElementRefs.value.set(dateKey, el)
  } else {
    dateElementRefs.value.delete(dateKey)
  }
}

// Watch for highlighted date changes and scroll
watch(
  () => props.highlightedDate,
  (newDate) => {
    if (!newDate) return

    const targetKey = findNearestDateKey(newDate)
    if (!targetKey) return

    const element = dateElementRefs.value.get(targetKey)
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
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
function setCreateCardRef(el: HTMLElement | ComponentPublicInstance | null) {
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
      <div v-if="creatingAtDate" :ref="setCreateCardRef">
        <CroutonBookingsBookingCreateCard
          :date="creatingAtDate"
          @created="emit('created')"
          @cancel="emit('cancelCreate')"
        />
      </div>

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
      <!-- Create card for new date (not in existing groups) -->
      <div
        v-if="creatingAtDate && !creatingDateHasBookings"
        :ref="setCreateCardRef"
      >
        <CroutonBookingsBookingCreateCard
          :date="creatingAtDate"
          @created="emit('created')"
          @cancel="emit('cancelCreate')"
        />
      </div>

      <div v-for="monthGroup in groupedBookings" :key="monthGroup.key" class="flex flex-col gap-2">
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
          class="flex flex-col gap-1.5"
        >
          <!-- Bookings for this date -->
          <CroutonBookingsBookingCard
            v-for="booking in dateGroup.bookings"
            :key="booking.id"
            :booking="booking"
            :highlighted="isHighlighted(booking)"
          />

          <!-- Inline create card if creating at this date -->
          <div
            v-if="creatingAtDateKey === dateGroup.dateKey"
            :ref="setCreateCardRef"
          >
            <CroutonBookingsBookingCreateCard
              :date="creatingAtDate!"
              @created="emit('created')"
              @cancel="emit('cancelCreate')"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
