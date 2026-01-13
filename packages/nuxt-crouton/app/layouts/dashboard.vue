<script setup lang="ts">
/**
 * Dashboard Layout
 *
 * Main layout for user dashboard pages. Uses the DashboardSidebar component
 * with auto-discovered app routes and collection navigation.
 *
 * Uses UDashboardPanel with UDashboardNavbar to provide:
 * - Mobile sidebar toggle button
 * - Proper header spacing
 * - Responsive layout structure
 */

</script>

<template>
  <UDashboardGroup>
    <CroutonDashboardSidebar />
    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar title="Dashboard" />
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>