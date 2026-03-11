<script setup lang="ts">
const { data: pages } = await useFetch('/api/public/pages')
</script>

<template>
  <footer class="fixed bottom-5 w-full py-2 md:sticky md:top-16 bg-white z-10 flex flex-row md:block mt-4">
    <div v-for="page in pages" :key="page.id">
      <a
        v-if="page.pageType === 'core:link' && page.config?.url"
        :href="page.config.url"
        class="rotated uppercase border-b-2 md:border-l-2 md:border-b-0 border-white hover:border-black mt-2 pr-2 pl-2 py-2"
        target="_blank"
      >
        {{ page.title }}
      </a>
      <NuxtLink
        v-else
        :to="`/${page.slug}`"
        class="rotated uppercase border-b-2 md:border-l-2 md:border-b-0 border-white hover:border-black mt-2 pr-2 pl-2 py-2"
      >
        {{ page.title }}
      </NuxtLink>
    </div>
  </footer>
</template>