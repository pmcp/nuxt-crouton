<script setup lang="ts">
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
}

const props = withDefaults(defineProps<Props>(), {
  bookings: undefined,
  loading: undefined,
  error: undefined,
  emptyMessage: 'Your bookings will appear here',
  hasActiveFilters: false,
})

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

// Group bookings by month/year for separators
interface BookingGroup {
  key: string
  label: string
  bookings: Booking[]
}

const groupedBookings = computed((): BookingGroup[] => {
  const groups: BookingGroup[] = []
  let currentKey = ''

  for (const booking of resolvedBookings.value) {
    const date = new Date(booking.date)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    const label = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date)

    if (key !== currentKey) {
      currentKey = key
      groups.push({ key, label, bookings: [] })
    }

    groups[groups.length - 1].bookings.push(booking)
  }

  return groups
})
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

    <!-- Empty state -->
    <div v-else-if="resolvedBookings.length === 0" class="bg-elevated/50 rounded-lg p-8 text-center">
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

    <!-- Bookings list with month/year separators -->
    <div v-else class="flex flex-col gap-4">
      <div v-for="group in groupedBookings" :key="group.key" class="flex flex-col gap-2">
        <!-- Month/Year separator -->
        <div class="flex items-center gap-2 py-1">
          <span class="text-xs font-medium text-muted uppercase tracking-wider">
            {{ group.label }}
          </span>
          <div class="flex-1 h-px bg-muted/20" />
        </div>

        <!-- Bookings in this group -->
        <CroutonBookingsBookingCard
          v-for="booking in group.bookings"
          :key="booking.id"
          :booking="booking"
        />
      </div>
    </div>
  </div>
</template>
