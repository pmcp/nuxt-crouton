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
