<script setup lang="ts">
const route = useRoute()

const categories = [
  { to: '/archive/poezie', label: 'Poezie', match: '/poezie' },
  { to: '/archive/txt', label: 'Txt', match: '/txt' },
  { to: '/archive/img', label: 'Img', match: '/img' },
  { to: '/archive/radio', label: 'Radio', match: '/radio' }
]
</script>

<template>
  <nav role="navigation" aria-labelledby="subNav" class="w-full flex text-xs md:text-sm">
    <h2 id="subNav" class="hidden">Articles menu</h2>
    <NuxtLink
      v-for="cat in categories"
      :key="cat.to"
      :to="cat.to"
      class="inline-block uppercase border-b-2 leading-5 border-white hover:border-black md:mr-5 pt-1.5 px-2 md:p-2"
      :class="{ 'router-link-active': route.path.includes(cat.match) }"
    >
      {{ cat.label }}
    </NuxtLink>
  </nav>
</template>
