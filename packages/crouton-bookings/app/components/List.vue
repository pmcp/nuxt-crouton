<script setup lang="ts">
const { bookings, loading, error, refresh } = useBookingsList()
</script>

<template>
  <div class="space-y-4">
    <!-- Loading state -->
    <div v-if="loading" class="flex flex-col gap-3">
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
    <div v-else-if="error" class="bg-error/10 border border-error/20 rounded-lg p-6 text-center">
      <UIcon name="i-lucide-alert-circle" class="w-8 h-8 text-error mx-auto mb-2" />
      <p class="text-sm text-error font-medium">Failed to load bookings</p>
      <p class="text-xs text-muted mt-1">{{ error.message || 'An error occurred' }}</p>
      <UButton
        variant="soft"
        color="error"
        size="sm"
        class="mt-3"
        @click="refresh"
      >
        Try Again
      </UButton>
    </div>

    <!-- Empty state -->
    <div v-else-if="bookings.length === 0" class="bg-elevated/50 rounded-lg p-8 text-center">
      <UIcon name="i-lucide-calendar-x" class="w-12 h-12 text-muted mx-auto mb-3" />
      <p class="text-sm font-medium">No bookings yet</p>
      <p class="text-xs text-muted mt-1">Your bookings will appear here</p>
    </div>

    <!-- Bookings list -->
    <div v-else class="flex flex-col gap-2">
      <CroutonBookingsBookingCard
        v-for="booking in bookings"
        :key="booking.id"
        :booking="booking"
      />
    </div>
  </div>
</template>
