<script setup lang="ts">
/**
 * Booking Locations Management Page
 *
 * Admin page for managing booking locations (courts, rooms, resources).
 * Uses the generic CroutonCollectionViewer with bookingsLocations collection.
 *
 * @route /admin/[team]/bookings/locations
 */
const { t } = useI18n()
</script>

<template>
  <div class="h-full">
    <CroutonCollectionViewer
      collection-name="bookingsLocations"
      :empty-text="t('bookings.locations.empty') || 'No locations yet. Create your first bookable location.'"
    />
  </div>
</template>