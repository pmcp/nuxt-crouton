<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})
</script>

<template>
  <div class="p-6 max-w-2xl mx-auto">
    <h1 class="text-xl font-semibold mb-4">My Bookings</h1>
    <CroutonBookingsList />
  </div>
</template>
