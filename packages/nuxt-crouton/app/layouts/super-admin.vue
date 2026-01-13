<script setup lang="ts">
/**
 * Super Admin Layout
 *
 * Layout for super admin pages (/super-admin/*).
 * Uses the AdminSidebar component with super admin context.
 */
</script>

<template>
  <UDashboardGroup>
    <CroutonAdminSidebar context="super" />
    <slot />
  </UDashboardGroup>
</template>
