<script setup lang="ts">
const { t } = useI18n()

// Fetch all team bookings (admin view - all bookings, not just current user's)
const { items: bookings, pending: bookingsPending } = await useCollectionQuery('bookingsBookings')
const { items: locations, pending: locationsPending } = await useCollectionQuery('bookingsLocations')
const { items: settings, pending: settingsPending } = await useCollectionQuery('bookingsSettings')

const loading = computed(() => bookingsPending.value || locationsPending.value || settingsPending.value)
const firstSettings = computed(() => settings.value?.[0] ?? null)
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
    />
  </div>
</template>
