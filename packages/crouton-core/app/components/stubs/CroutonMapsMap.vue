<script setup lang="ts">
// Stub component - overridden by @fyit/crouton-maps when installed
// Renders nothing; real component provides an interactive MapLibre map.

defineProps<{
  center?: [number, number]
  zoom?: number
  style?: string
  height?: string
  width?: string
}>()

defineEmits<{
  load: [map: unknown]
  error: [error: string]
}>()
</script>

<template><!-- stub: overridden by @fyit/crouton-maps --></template>
