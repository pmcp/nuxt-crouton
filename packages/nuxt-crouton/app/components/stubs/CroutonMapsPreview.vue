<template>
  <div
    v-if="location"
    class="text-sm"
  >
    <span v-if="typeof location === 'string'">{{ location }}</span>
    <span v-else-if="location.lat && location.lng">
      {{ location.lat.toFixed(4) }}, {{ location.lng.toFixed(4) }}
    </span>
    <span v-else-if="location.address">{{ location.address }}</span>
  </div>
  <span
    v-else
    class="text-muted"
  >
    —
  </span>
</template>

<script setup lang="ts">
// Stub component - overridden by nuxt-crouton-maps when installed
// Provides basic location display fallback

interface Props {
  location?: string | { lat?: number; lng?: number; address?: string } | null
}

defineProps<Props>()
</script>
