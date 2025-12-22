<script setup lang="ts">
interface Props {
  size?: 'sm' | 'xl'
}

withDefaults(defineProps<Props>(), {
  size: 'sm',
})
</script>

<template>
  <CroutonBookingBookingSidebarXL v-if="size === 'xl'" />
  <CroutonBookingBookingSidebarSM v-else />
</template>
