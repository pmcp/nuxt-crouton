<script setup lang="ts">
/**
 * CollabEditingBadge Stub
 *
 * No-op placeholder component when crouton-collab is not installed.
 * Gets overridden by the real component from @fyit/crouton-collab.
 *
 * This prevents Vue warnings about unresolved components.
 */
defineProps<{
  roomId?: string
  roomType?: string
  pollInterval?: number
  size?: string
  variant?: string
  currentUserId?: string
}>()
</script>

<template>
  <!-- No-op: collab not installed -->
</template>