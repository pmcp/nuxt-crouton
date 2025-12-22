<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})
</script>

<template>
  <div class="p-4 md:p-6">
    <h1 class="text-xl font-semibold mb-4">My Bookings</h1>
    <CroutonBookingMyBookingsList />
  </div>
</template>
