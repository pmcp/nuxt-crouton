<script setup lang="ts">
/**
 * Team Admin Layout
 *
 * Layout for team admin pages (/admin/[team]/*).
 * Uses the AdminSidebar component with team context.
 */
</script>

<template>
  <UDashboardGroup>
    <CroutonAdminSidebar context="team" />
    <slot />
  </UDashboardGroup>
</template>
