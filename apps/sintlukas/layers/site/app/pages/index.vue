<script setup lang="ts">
/**
 * Root redirect — sends / to /nl/ (default locale).
 */
definePageMeta({ layout: false })
await navigateTo('/nl/', { redirectCode: 302 })
</script>

<template>
  <div />
</template>
