<script setup lang="ts">
import { useRuntimeConfig } from 'nuxt/app'

// Only mount the changelog overlay when the crouton-devtools pill is enabled
// (dev / NUXT_PUBLIC_CROUTON_DEVTOOLS / NUXT_PUBLIC_CROUTON_REVIEW). Matches the
// gating in app/plugins/devtools-version.client.ts so it's a no-op otherwise.
const showChangelogTool = import.meta.dev || !!useRuntimeConfig().public.croutonDevtools
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ClientOnly>
      <SpikeChangelogTool v-if="showChangelogTool" />
      <SpecWalk v-if="showChangelogTool" />
    </ClientOnly>
  </UApp>
</template>
