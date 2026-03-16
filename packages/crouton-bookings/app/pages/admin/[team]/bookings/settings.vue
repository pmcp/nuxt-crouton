<script setup lang="ts">
/**
 * Booking Settings Management Page
 *
 * Admin page for managing booking settings (statuses, groups, etc.).
 * Uses the generic CroutonCollectionViewer with bookingsSettings collection.
 *
 * @route /admin/[team]/bookings/settings
 */
const { t } = useI18n()
</script>

<template>
  <div class="h-full">
    <CroutonCollectionViewer
      collection-name="bookingsSettings"
      :empty-text="t('bookings.settings.empty')"
    />
  </div>
</template>