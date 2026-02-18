<script setup lang="ts">
/**
 * Team Section Parent Layout
 *
 * Provides horizontal tab navigation for all team admin pages.
 * Child routes render in the body via <NuxtPage />.
 *
 * @route /admin/[team]/team
 */
definePageMeta({
  middleware: ['auth', 'team-admin'],
  layout: 'admin'
})

const route = useRoute()
const { t } = useT()
const teamSlug = computed(() => route.params.team as string)

// Tab navigation items
const tabs = computed(() => [
  [
    {
      label: t('teams.members') || 'Members',
      icon: 'i-lucide-users',
      to: `/admin/${teamSlug.value}/team`,
      exact: true
    },
    {
      label: t('teams.invitations') || 'Invitations',
      icon: 'i-lucide-mail',
      to: `/admin/${teamSlug.value}/team/invitations`
    },
    {
      label: t('teams.teamSettings') || 'Settings',
      icon: 'i-lucide-settings',
      to: `/admin/${teamSlug.value}/team/settings`
    }
  ]
])
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('navigation.team') || 'Team'">
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
