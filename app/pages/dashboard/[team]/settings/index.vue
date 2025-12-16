<script setup lang="ts">
/**
 * Account Settings Page
 *
 * User account settings including profile, password, and danger zone.
 * Uses the AccountSettings component which provides tabbed navigation.
 *
 * @route /dashboard/settings (single-tenant/personal) or /dashboard/:team/settings (multi-tenant)
 */
definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard',
})

const route = useRoute()

// Get the initial tab from query param if provided
const initialTab = computed(() => {
  const tab = route.query.tab as string | undefined
  return tab ?? 'profile'
})
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <AccountSettings :default-tab="initialTab" />
  </div>
</template>
