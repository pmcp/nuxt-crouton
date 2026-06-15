<script setup lang="ts">
const colorMode = useColorMode()
colorMode.preference = 'light'

useHead({
  meta: [
    { name: 'color-scheme', content: 'light only' }
  ],
  htmlAttrs: {
    style: 'color-scheme: light !important'
  }
})
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
