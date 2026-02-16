<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

navigateTo('/designer', { redirectCode: 301 })
</script>

<template>
  <div />
</template>
