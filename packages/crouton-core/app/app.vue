<script setup lang="ts">
useHead({
  link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
})
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <div class="bg-default" data-vaul-drawer-wrapper>
      <NuxtLayout>
        <NuxtPage />
        <CroutonForm />
        <AuthRouteModal />
      </NuxtLayout>
    </div>
  </UApp>
</template>
