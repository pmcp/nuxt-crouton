<script setup lang="ts">
/**
 * e2e surface page (#210, spike): single-client mount of crouton-collab's
 * realtime stack. `useCollabSync` opens a real WebSocket room (client-only, via
 * tryOnMounted — SSR-safe) and `CollabStatus` renders its live connection state.
 *
 * The surface only asserts the collab UI *mounts* (the status dot renders) — it
 * does not assert a second client, since that's the expensive part deferred by
 * the spike. Mounting alone exercises the layer's components + composables +
 * the local WS endpoint, which is enough to catch boot/scaffolder regressions.
 */
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'team-admin']
})

const { connected, synced, error } = useCollabSync({
  roomId: 'e2e-collab-check',
  roomType: 'generic',
  structure: 'map'
})
</script>

<template>
  <UDashboardPanel id="collab-check">
    <UDashboardNavbar title="Collab Check">
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>
    </UDashboardNavbar>

    <div
      data-testid="collab-check"
      class="p-6"
    >
      <CollabStatus
        :connected="connected"
        :synced="synced"
        :error="error"
      />
    </div>
  </UDashboardPanel>
</template>
