<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Reconcile/verify walk (#1039) — inert until opened from the feedback launcher's "Spec walk" tool. -->
    <SpecWalkPanel />
  </UApp>
</template>
