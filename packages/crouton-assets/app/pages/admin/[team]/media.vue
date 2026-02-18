<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'team-admin']
})

const { teamId } = useTeamContext()
</script>

<template>
  <UDashboardPanel id="assets-library">
    <UDashboardNavbar title="Media Library">
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>
    </UDashboardNavbar>

    <CroutonAssetsLibrary :team-id="teamId" />
  </UDashboardPanel>
</template>
