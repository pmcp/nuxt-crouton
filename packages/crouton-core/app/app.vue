<script setup lang="ts">
const { teamName } = useTeamContext()

useHead({
  link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  titleTemplate: (title) => {
    const name = teamName.value
    return title && name ? `${title} | ${name}` : title || name || ''
  }
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
