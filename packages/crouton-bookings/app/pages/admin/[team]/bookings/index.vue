<script setup lang="ts">
const { t } = useI18n()

// Fetch all team bookings (admin view - all bookings, not just current user's)
const { items: bookings, pending: bookingsPending, refresh: refreshBookings } = await useCollectionQuery('bookingsBookings')
const { items: locations, pending: locationsPending } = await useCollectionQuery('bookingsLocations')
const { items: settings, pending: settingsPending } = await useCollectionQuery('bookingsSettings')

const loading = computed(() => bookingsPending.value || locationsPending.value || settingsPending.value)
const firstSettings = computed(() => settings.value?.[0] ?? null)

// Refresh bookings when a new booking is created, updated, or email sent
async function handleBookingChange() {
  await refreshBookings()
}
</script>

<template>
  <div class="h-full p-4">
    <CroutonBookingsPanel
      :bookings="bookings"
      :locations="locations"
      :settings="firstSettings"
      :loading="loading"
      title=""
      empty-message="No bookings yet for this team"
      @created="handleBookingChange"
      @updated="handleBookingChange"
    />
  </div>
</template>
