<script setup lang="ts">
/**
 * Team Admin Layout
 *
 * Layout for team admin pages (/admin/[team]/*).
 * Provides sidebar + slot - pages provide their own UDashboardPanel.
 *
 * This allows each section (bookings, team settings, etc.) to:
 * - Have its own title in UDashboardNavbar
 * - Add horizontal tabs via UNavigationMenu
 * - Control their own panel structure
 */
</script>

<template>
  <UDashboardGroup>
    <CroutonAdminSidebar context="team" />
    <slot />
  </UDashboardGroup>
</template>
