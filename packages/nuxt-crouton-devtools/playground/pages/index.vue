<script setup lang="ts">
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">
        Nuxt Crouton DevTools Playground
      </h1>
      <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">
        Open Nuxt DevTools to see the Crouton tab with collection information.
      </p>

      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">Getting Started</h2>
        </template>

        <div class="space-y-4">
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-2">
              Step 1: Open DevTools
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              Press <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">Shift + Option + D</kbd> or look for the DevTools icon in the bottom of your screen.
            </p>
          </div>

          <USeparator />

          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-2">
              Step 2: Find the Crouton Tab
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              Navigate to the "Crouton" tab in the DevTools interface.
            </p>
          </div>

          <USeparator />

          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-2">
              Step 3: Explore Features
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              You should see 4 tabs: Collections, Operations, API Explorer, and Data Browser.
            </p>
          </div>
        </div>
      </UCard>

      <div class="mt-8">
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold">Mock Collections</h2>
          </template>

          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span class="font-mono">tasks</span>
              <UBadge color="green" variant="subtle">internal</UBadge>
            </div>
            <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span class="font-mono">projects</span>
              <UBadge color="green" variant="subtle">internal</UBadge>
            </div>
            <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span class="font-mono">users</span>
              <UBadge color="blue" variant="subtle">external</UBadge>
            </div>
            <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span class="font-mono">notes</span>
              <UBadge color="green" variant="subtle">internal</UBadge>
            </div>
          </div>
        </UCard>
      </div>

      <div class="mt-8">
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold">DevTools Features</h2>
          </template>

          <div class="space-y-3">
            <div>
              <h4 class="font-semibold text-sm text-gray-900 dark:text-white">📋 Collections</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">View all registered collections with search and detail view</p>
            </div>
            <div>
              <h4 class="font-semibold text-sm text-gray-900 dark:text-white">📊 Operations</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">Monitor real-time CRUD operations with filters and statistics</p>
            </div>
            <div>
              <h4 class="font-semibold text-sm text-gray-900 dark:text-white">🚀 API Explorer</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">Test API endpoints interactively without Postman</p>
            </div>
            <div>
              <h4 class="font-semibold text-sm text-gray-900 dark:text-white">💾 Data Browser</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">Browse and manage collection data with full CRUD capabilities</p>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
