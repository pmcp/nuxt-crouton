<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

navigateTo('/admin', { redirectCode: 301 })
</script>

<template>
  <div />
</template>
