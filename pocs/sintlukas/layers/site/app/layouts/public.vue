<script setup lang="ts">
/**
 * Sint-Lukas public layout — faithful port of original.
 * Overflow clip, header + UPage-style content + footer.
 */
</script>

<template>
  <div class="relative overflow-clip w-full">
    <SiteHeader />
    <main class="mt-0 pb-0">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
