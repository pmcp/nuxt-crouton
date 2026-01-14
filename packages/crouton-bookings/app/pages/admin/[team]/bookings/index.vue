<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const { t } = useI18n()

// Fetch all team bookings (admin view)
const { items: bookings, pending, refresh } = await useCollectionQuery('bookingsBookings')
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('bookings.admin.title')">
        <template #right>
          <UButton
            icon="i-lucide-plus"
            color="primary"
            :label="t('common.create')"
            @click="useCrouton().open('bookingsBookings', 'create')"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4">
        <CroutonBookingsList
          :bookings="bookings"
          :loading="pending"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
