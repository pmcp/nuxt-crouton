<script setup lang="ts">
// Explicit import (not auto-import) so the panel is guaranteed registered — a prod build
// silently drops an unresolved component (the warn is stripped), which is why it wasn't mounting.
import SpecWalkPanel from '~/components/SpecWalkPanel.vue'
if (import.meta.client) { const w = window as unknown as { __SW?: Record<string, unknown> }; w.__SW = w.__SW || {}; w.__SW.app = true; w.__SW.imp = !!SpecWalkPanel }
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Reconcile/verify walk (#1039) — inert until opened from the feedback launcher's "Spec walk" tool. -->
    <SpecWalkPanel />
  </UApp>
</template>
