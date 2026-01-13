<script setup lang="ts">
/**
 * Super Admin Layout
 *
 * Layout for super admin pages (/super-admin/*).
 * Uses the AdminSidebar component with super admin context.
 *
 * Uses UDashboardPanel with UDashboardNavbar to provide:
 * - Mobile sidebar toggle button
 * - Proper header spacing
 * - Responsive layout structure
 */
</script>

<template>
  <UDashboardGroup>
    <CroutonAdminSidebar context="super" />
    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar title="Super Admin" />
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
