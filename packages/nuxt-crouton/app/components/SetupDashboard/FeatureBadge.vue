<script setup lang="ts">
interface Props {
  label: string
  icon?: string
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
}

withDefaults(defineProps<Props>(), {
  color: 'neutral'
})
</script>

<template>
  <UBadge
    :label="label"
    :leading-icon="icon"
    :color="color"
    variant="subtle"
    size="xs"
  />
</template>
