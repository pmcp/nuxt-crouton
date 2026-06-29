<template>
  <!-- UApp provides Nuxt UI's app context (toast / overlays / tooltips). The v52 board
       calls useToast() for its page-action handlers, so this wrapper is required — without
       it SSR throws ("useToast requires UApp"). Mirrors the demo POC's app.vue. -->
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
