<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const { t } = useI18n()

// Fetch all team bookings (admin view - all bookings, not just current user's)
const { items: bookings, pending: bookingsPending } = await useCollectionQuery('bookingsBookings')
const { items: locations, pending: locationsPending } = await useCollectionQuery('bookingsLocations')
const { items: settings, pending: settingsPending } = await useCollectionQuery('bookingsSettings')

const loading = computed(() => bookingsPending.value || locationsPending.value || settingsPending.value)
const firstSettings = computed(() => settings.value?.[0] ?? null)
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Page header -->
    <div class="px-4 py-3 border-b border-default">
      <h1 class="text-lg font-semibold">
        {{ t('bookings.admin.title') }}
      </h1>
    </div>

    <!-- Panel content -->
    <div class="flex-1 overflow-hidden px-4 pt-4">
      <CroutonBookingsPanel
        :bookings="bookings"
        :locations="locations"
        :settings="firstSettings"
        :loading="loading"
        title=""
        empty-message="No bookings yet for this team"
      />
    </div>
  </div>
</template>
