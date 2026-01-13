<script setup lang="ts">
/**
 * Team Admin Layout
 *
 * Layout for team admin pages (/admin/[team]/*).
 * Uses the AdminSidebar component with team context.
 *
 * Uses UDashboardPanel with UDashboardNavbar to provide:
 * - Mobile sidebar toggle button
 * - Proper header spacing
 * - Responsive layout structure
 */
</script>

<template>
  <UDashboardGroup>
    <CroutonAdminSidebar context="team" />
    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar title="Admin" />
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
