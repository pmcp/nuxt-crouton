<script setup lang="ts">
/**
 * Minimal layout for Studio pages
 * Provides CSS injection without additional UI chrome
 */
</script>

<template>
  <div class="studio-layout">
    <slot />
  </div>
</template>

<style>
.studio-layout {
  min-height: 100vh;
}
</style>
