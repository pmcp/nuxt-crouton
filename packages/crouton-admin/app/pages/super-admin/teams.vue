<script setup lang="ts">
/**
 * Super Admin Teams Page
 *
 * Team oversight page with search and filters.
 * Protected by super-admin middleware.
 */
definePageMeta({
  middleware: 'super-admin'
})

useSeoMeta({
  title: 'View Teams - Super Admin'
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- Page Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/super-admin"
            class="flex size-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <UIcon
              name="i-heroicons-arrow-left"
              class="size-5"
            />
          </NuxtLink>
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900">
              <UIcon
                name="i-heroicons-building-office-2"
                class="size-5 text-violet-600 dark:text-violet-400"
              />
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                View Teams
              </h1>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Browse all teams and their members
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Team List Component -->
    <AdminTeamList :page-size="20" />
  </div>
</template>
