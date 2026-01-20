<script setup lang="ts">
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
    <div class="max-w-md mx-auto text-center">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Studio Test App
      </h1>
      <p class="text-gray-600 dark:text-gray-400 mb-6">
        This is a minimal app for testing Crouton Studio.
      </p>
      <NuxtLink
        to="/_studio"
        class="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
      >
        Open Studio →
      </NuxtLink>
    </div>
  </div>
</template>
