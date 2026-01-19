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
          <h2 class="text-xl font-semibold">
            Getting Started
          </h2>
        </template>

        <div class="space-y-4">
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-2">
              Step 1: Open DevTools
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              Look for the DevTools icon in the bottom of your screen and click it.
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
              Step 3: Explore Collections
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              You should see 4 mock collections: tasks, projects, users, and notes.
            </p>
          </div>
        </div>
      </UCard>

      <div class="mt-8">
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold">
              Mock Collections
            </h2>
          </template>

          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span class="font-mono">tasks</span>
              <UBadge
                color="green"
                variant="subtle"
              >
                internal
              </UBadge>
            </div>
            <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span class="font-mono">projects</span>
              <UBadge
                color="green"
                variant="subtle"
              >
                internal
              </UBadge>
            </div>
            <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span class="font-mono">users</span>
              <UBadge
                color="blue"
                variant="subtle"
              >
                external
              </UBadge>
            </div>
            <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span class="font-mono">notes</span>
              <UBadge
                color="green"
                variant="subtle"
              >
                internal
              </UBadge>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
