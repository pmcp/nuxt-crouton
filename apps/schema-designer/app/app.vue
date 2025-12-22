<script setup lang="ts">
const colorMode = useColorMode()

// Load saved state on mount
const { loadFromLocalStorage } = useSchemaDesigner()

onMounted(() => {
  loadFromLocalStorage()
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>