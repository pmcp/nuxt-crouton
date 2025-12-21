<script setup lang="ts">
interface Props {
  mode?: 'dropdown' | 'inline' | 'cycle'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showDarkMode?: boolean
}

withDefaults(defineProps<Props>(), {
  mode: 'dropdown',
  size: 'sm',
  showDarkMode: true
})
</script>

<template>
  <div class="flex items-center gap-1">
    <!-- Theme switcher (stub from nuxt-crouton, overridden by nuxt-crouton-themes) -->
    <ThemeSwitcher :mode="mode" :size="size" />
    <!-- Dark mode toggle (always available) -->
    <CroutonDarkModeSwitcher v-if="showDarkMode" :size="size" />
  </div>
</template>
