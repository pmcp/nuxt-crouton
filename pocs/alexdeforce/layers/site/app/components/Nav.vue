<script setup lang="ts">
const route = useRoute()

const links = [
  { to: '/', label: 'nu', match: (path: string) => path === '/' },
  { to: '/agenda', label: 'Agenda', match: (path: string) => path.includes('/agenda') },
  { to: '/totnutoe', label: 'Tot Nu Toe', match: (path: string) => path.includes('/totnutoe') },
  { to: '/archive/poezie', label: 'Archief', match: (path: string) => path.includes('/archive') }
]
</script>

<template>
  <nav role="navigation" aria-labelledby="mainNav" class="flex text-xs md:text-sm pl-1 md:pl-0">
    <h2 id="mainNav" class="hidden">Main menu</h2>
    <NuxtLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      class="text-center whitespace-nowrap inline-block leading-5 uppercase border-b-2 border-white hover:border-black md:mr-5 pt-1.5 px-1 md:p-2"
      :class="{ 'router-link-active': link.match(route.path) }"
    >
      {{ link.label }}
    </NuxtLink>
  </nav>
</template>
