<script setup lang="ts">
/**
 * Sint-Lukas public layout override.
 * Replaces the floating pill nav from crouton-pages with a
 * traditional header + content + footer structure.
 */
</script>

<template>
  <div class="min-h-screen flex flex-col bg-white">
    <SiteHeader />

    <main class="flex-1">
      <slot />
    </main>

    <SiteFooter />
  </div>
</template>
