<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="My Bookings" />
    </template>

    <template #body>
      <CroutonBookingsList />
    </template>
  </UDashboardPanel>
</template>
