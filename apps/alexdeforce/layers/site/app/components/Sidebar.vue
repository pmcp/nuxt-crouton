<script setup lang="ts">
const links = [
  { to: '/about', label: 'About' },
  { to: '/mailinglist', label: 'Mailinglist' },
  { to: '/shop', label: 'Shop' },
  { to: '/totnutoe', label: 'Tot nu toe' }
]
</script>

<template>
  <!-- Desktop: vertical rotated sidebar -->
  <div class="hidden md:block sticky top-16">
    <div class="rotated">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="uppercase text-xs border-l-2 border-white hover:border-black pr-2 pl-2 py-2 transition-colors"
      >
        {{ link.label }}
      </NuxtLink>
    </div>
  </div>

  <!-- Mobile: horizontal bottom bar -->
  <div class="md:hidden fixed bottom-5 left-0 w-full flex justify-center z-10">
    <div class="flex">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="uppercase text-xs border-r-2 border-white hover:border-black px-2 py-1 transition-colors"
      >
        {{ link.label }}
      </NuxtLink>
    </div>
  </div>
</template>
