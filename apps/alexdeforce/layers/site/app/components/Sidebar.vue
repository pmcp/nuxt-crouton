<script setup lang="ts">
// Hardcoded navigation matching the original alexdeforce site.
// These link to CMS pages managed via crouton-pages at /[team]/[locale]/[slug].
// For now, keep them as static links until the pages system is wired up for public use.
const links = [
  { to: '/about', label: 'About', external: false },
  { to: '/mailinglist', label: 'Mailinglist', external: false },
  { to: '/shop', label: 'Shop', external: false },
  { to: '/totnutoe', label: 'Tot nu toe', external: false }
]
</script>

<template>
  <footer class="fixed bottom-5 w-full py-2 md:sticky md:top-16 bg-white z-10 flex flex-row md:block mt-4">
    <div v-for="link in links" :key="link.to">
      <a
        v-if="link.external"
        :href="link.to"
        class="rotated uppercase border-b-2 md:border-l-2 md:border-b-0 border-white hover:border-black mt-2 pr-2 pl-2 py-2"
        target="_blank"
      >
        {{ link.label }}
      </a>
      <NuxtLink
        v-else
        :to="link.to"
        class="rotated uppercase border-b-2 md:border-l-2 md:border-b-0 border-white hover:border-black mt-2 pr-2 pl-2 py-2"
      >
        {{ link.label }}
      </NuxtLink>
    </div>
  </footer>
</template>
