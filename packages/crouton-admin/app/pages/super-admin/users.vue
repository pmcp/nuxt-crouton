<script setup lang="ts">
/**
 * Super Admin Users Page
 *
 * User management page with search, filters, and actions.
 * Protected by super-admin middleware.
 */
definePageMeta({
  middleware: 'super-admin'
})

useSeoMeta({
  title: 'Manage Users - Super Admin'
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
            <div class="flex size-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
              <UIcon
                name="i-heroicons-users"
                class="size-5 text-blue-600 dark:text-blue-400"
              />
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                Manage Users
              </h1>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                View, create, and manage user accounts
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- User List Component -->
    <AdminUserList :page-size="20" />
  </div>
</template>
