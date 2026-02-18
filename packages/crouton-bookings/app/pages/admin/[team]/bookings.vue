<script setup lang="ts">
/**
 * Bookings Section Parent Layout
 *
 * Provides horizontal tab navigation for all booking admin pages.
 * Child routes render in the body via <NuxtPage />.
 *
 * @route /admin/[team]/bookings
 */
definePageMeta({
  middleware: ['auth'],
  layout: 'admin'
})

const route = useRoute()
const { t } = useT()
const teamSlug = computed(() => route.params.team as string)

// Tab navigation items
const tabs = computed(() => [
  [
    {
      label: t('bookings.admin.overview') || 'Overview',
      icon: 'i-lucide-calendar',
      to: `/admin/${teamSlug.value}/bookings`,
      exact: true // Only highlight when exactly on /bookings, not child routes
    },
    {
      label: t('bookings.admin.locations') || 'Locations',
      icon: 'i-lucide-map-pin',
      to: `/admin/${teamSlug.value}/bookings/locations`
    },
    {
      label: t('bookings.admin.settings') || 'Settings',
      icon: 'i-lucide-settings',
      to: `/admin/${teamSlug.value}/bookings/settings`
    },
    {
      label: t('bookings.settings.emailTemplates') || 'Email Templates',
      icon: 'i-lucide-mail',
      to: `/admin/${teamSlug.value}/bookings/email-templates`
    },
    {
      label: t('bookings.settings.emailLogs') || 'Email Logs',
      icon: 'i-lucide-file-text',
      to: `/admin/${teamSlug.value}/bookings/email-logs`
    }
  ]
])
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('bookings.admin.sectionTitle') || 'Bookings'">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UNavigationMenu
        :items="tabs"
        orientation="horizontal"
        highlight
        highlight-color="primary"
        class="border-b border-default px-4"
      />
    </template>

    <template #body>
      <div class="max-w-5xl mx-auto w-full">
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
