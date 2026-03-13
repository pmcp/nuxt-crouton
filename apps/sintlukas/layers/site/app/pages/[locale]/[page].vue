<script setup lang="ts">
/**
 * Catch-all for CMS pages not handled by explicit routes.
 * Fetches page by slug from the pages collection.
 */
definePageMeta({ layout: 'public' })

const route = useRoute()
const slug = route.params.page as string

const { data: page, error } = await useFetch(`/api/public/pages/${slug}`)

if (error.value) {
  throw createError({ status: 404, statusText: 'Pagina niet gevonden' })
}

// Redirect external link pages
if (page.value?.pageType === 'core:link' && page.value?.config?.url) {
  await navigateTo(page.value.config.url, { external: true })
}

useHead({
  title: computed(() => page.value?.title ? `${page.value.title} — Sint-Lukas Academie` : 'Sint-Lukas Academie')
})
</script>

<template>
  <div v-if="page">
    <!-- Banner -->
    <div class="w-full relative mb-12 md:mb-16 z-0 h-60">
      <div class="absolute z-30 h-full w-full pt-8 sm:pt-16 top-0">
        <div class="text-4xl leading-tight h-auto whitespace-pre-line mx-auto px-6 lg:px-8 max-w-7xl" />
      </div>
    </div>

    <div class="mx-auto px-6 lg:px-8 max-w-7xl">
      <h1 class="text-4xl pb-0">{{ page.title }}</h1>
      <div
        v-if="page.contentHtml"
        class="prose max-w-none mt-8"
        v-html="page.contentHtml"
      />
    </div>
    <div class="h-8" />
  </div>
</template>
