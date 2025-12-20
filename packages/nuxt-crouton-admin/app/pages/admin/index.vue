<script setup lang="ts">
/**
 * Admin Dashboard Page
 *
 * Main admin landing page with stats overview and quick actions.
 * Protected by super-admin middleware.
 */
definePageMeta({
  middleware: 'super-admin'
})

useSeoMeta({
  title: 'Admin Dashboard'
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- Page Header -->
    <div class="mb-8">
      <div class="flex items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900">
          <UIcon
            name="i-heroicons-shield-check"
            class="size-5 text-primary-600 dark:text-primary-400"
          />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Manage users, teams, and monitor system activity
          </p>
        </div>
      </div>
    </div>

    <!-- Dashboard Component -->
    <AdminDashboard :show-quick-actions="true" />
  </div>
</template>
