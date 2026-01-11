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
      <div class="h-full p-4">
        <CroutonBookingsBookingsPanel />
      </div>
    </template>
  </UDashboardPanel>
</template>
