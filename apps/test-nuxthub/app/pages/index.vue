<script setup lang="ts">
// Redirect to login if not authenticated
definePageMeta({
  middleware: 'auth'
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <h1 class="text-2xl font-bold mb-4">Welcome to Test NuxtHub</h1>
      <p class="text-gray-600">You are logged in!</p>
    </div>
  </div>
</template>
