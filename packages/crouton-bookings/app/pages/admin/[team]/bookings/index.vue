<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()

// Get team ID from route
const teamId = computed(() => route.params.team as string)

// Fetch all team bookings with email details (admin view - includes emailDetails with scheduledFor dates)
const { data: bookings, pending: bookingsPending, refresh: refreshBookings } = await useFetch(
  () => teamId.value ? `/api/crouton-bookings/teams/${teamId.value}/admin-bookings` : null,
  {
    default: () => [],
    watch: [teamId],
  }
)

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
