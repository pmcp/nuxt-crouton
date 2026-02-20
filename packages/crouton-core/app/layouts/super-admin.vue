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
  <div class="flex flex-col h-dvh">
    <UDashboardGroup class="flex-1 min-h-0">
      <CroutonAdminSidebar context="super" />
      <UDashboardPanel>
        <UDashboardNavbar title="Super Admin">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
        </UDashboardNavbar>
        <div class="flex-1 overflow-y-auto">
          <slot />
        </div>
      </UDashboardPanel>
    </UDashboardGroup>
    <CroutonAdminStatusBar />
  </div>
</template>
