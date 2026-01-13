<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const { t } = useI18n()
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('bookings.myBookings.title')" />
    </template>

    <template #body>
      <div class="h-full p-4">
        <CroutonBookingsPanel />
      </div>
    </template>
  </UDashboardPanel>
</template>
