<script setup lang="ts">
/**
 * e2e surface page (#209): mounts the real CroutonAssetsPicker so the smoke can
 * assert it renders. CroutonAssetsPicker is an optional cross-package component —
 * crouton-core ships a no-op `priority: -1` stub that renders *nothing*; the real
 * Picker (from @fyit/crouton-assets) overrides it and renders a trigger button.
 * The surface asserts a button exists inside the wrapper below, so it goes red if
 * the stub stops being overridden (the optional-component pattern regresses).
 */
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'team-admin']
})

const selected = ref<string>()
</script>

<template>
  <UDashboardPanel id="assets-picker-check">
    <UDashboardNavbar title="Assets Picker Check">
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>
    </UDashboardNavbar>

    <div
      data-testid="assets-picker-check"
      class="p-6"
    >
      <CroutonAssetsPicker v-model="selected" />
    </div>
  </UDashboardPanel>
</template>
