<script setup lang="ts">
defineProps<{
  html: string
}>()
</script>

<template>
  <div class="embed-container" v-html="html" />
</template>
