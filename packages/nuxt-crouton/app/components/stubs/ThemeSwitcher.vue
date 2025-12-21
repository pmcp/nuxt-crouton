<script setup lang="ts">
// Stub component - overridden by nuxt-crouton-themes when installed
// Props match the real ThemeSwitcher API for compatibility
interface Props {
  mode?: 'dropdown' | 'inline' | 'cycle'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showColorMode?: boolean
}

defineProps<Props>()
</script>

<template>
  <!-- No output - nuxt-crouton-themes provides the real component -->
</template>
