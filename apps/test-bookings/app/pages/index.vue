<script setup lang="ts">
// Test bookings app - dogfooding crouton-bookings package
</script>

<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-4">Test Bookings App</h1>
    <p class="text-neutral-600 mb-8">Dogfooding the @friendlyinternet/crouton-bookings package</p>

    <div class="grid gap-4">
      <UCard>
        <template #header>
          <h2 class="font-semibold">Locations</h2>
        </template>
        <NuxtLink to="/admin/bookings-locations" class="text-primary">
          Manage Locations
        </NuxtLink>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold">Bookings</h2>
        </template>
        <NuxtLink to="/admin/bookings-bookings" class="text-primary">
          Manage Bookings
        </NuxtLink>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold">Settings</h2>
        </template>
        <NuxtLink to="/admin/bookings-settings" class="text-primary">
          Booking Settings
        </NuxtLink>
      </UCard>
    </div>
  </div>
</template>