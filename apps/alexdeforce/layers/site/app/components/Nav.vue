<script setup lang="ts">
const links = [
  { to: '/', label: 'NU' },
  { to: '/agenda', label: 'AGENDA' },
  { to: '/totnutoe', label: 'TOT NU TOE' },
  { to: '/archive', label: 'ARCHIEF' }
]
</script>

<template>
  <nav class="flex items-center">
    <NuxtLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      class="text-xs md:text-sm uppercase border-b-2 border-white hover:border-black md:mr-5 pt-1.5 px-1 md:p-2 transition-colors"
    >
      {{ link.label }}
    </NuxtLink>
  </nav>
</template>
