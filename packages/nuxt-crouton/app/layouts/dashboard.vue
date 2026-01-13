<script setup lang="ts">
/**
 * Dashboard Layout
 *
 * Main layout for user dashboard pages. Uses the DashboardSidebar component
 * with auto-discovered app routes and collection navigation.
 */
</script>

<template>
  <UDashboardGroup>
    <CroutonDashboardSidebar />
    <slot />
  </UDashboardGroup>
</template>