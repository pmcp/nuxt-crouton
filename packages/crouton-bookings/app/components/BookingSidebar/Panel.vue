<script setup lang="ts">
interface Props {
  size?: 'sm' | 'xl'
}

withDefaults(defineProps<Props>(), {
  size: 'sm',
})
</script>

<template>
  <BookingSidebarXL v-if="size === 'xl'" />
  <BookingSidebarSM v-else />
</template>
