<script setup lang="ts">
// Mini card component for displaying a single locale's translation status
defineProps<{
  locale: string // Locale code (en, nl, fr)
  hasTranslation: boolean // Whether translation exists
}>()
</script>

<template>
  <UBadge
    :color="hasTranslation ? 'primary' : 'neutral'"
    variant="subtle"
    size="sm"
  >
    {{ locale.toUpperCase() }}
  </UBadge>
</template>
