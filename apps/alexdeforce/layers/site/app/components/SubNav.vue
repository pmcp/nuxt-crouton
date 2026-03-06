<script setup lang="ts">
const categories = [
  { to: '/archive/poezie', label: 'POEZIE' },
  { to: '/archive/txt', label: 'TXT' },
  { to: '/archive/img', label: 'IMG' },
  { to: '/archive/radio', label: 'RADIO' }
]
</script>

<template>
  <nav class="flex items-center">
    <NuxtLink
      v-for="cat in categories"
      :key="cat.to"
      :to="cat.to"
      class="text-xs md:text-sm uppercase border-b-2 border-white hover:border-black md:mr-5 pt-1.5 px-1 md:p-2 transition-colors"
    >
      {{ cat.label }}
    </NuxtLink>
  </nav>
</template>
