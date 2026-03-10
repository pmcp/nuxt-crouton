<script setup lang="ts">
const colorMode = useColorMode()
colorMode.preference = 'light'
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
