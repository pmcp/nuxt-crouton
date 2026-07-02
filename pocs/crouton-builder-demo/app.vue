<script setup lang="ts">
// (#1039 debug) confirm whether this app.vue actually runs — the panel now mounts in the page.
if (import.meta.client) { const w = window as unknown as { __SW?: Record<string, unknown> }; w.__SW = w.__SW || {}; w.__SW.app = true }
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
