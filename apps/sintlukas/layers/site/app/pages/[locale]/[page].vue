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
  <div v-if="page" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <h1 class="text-3xl sm:text-4xl font-bold text-neutral-900 mb-10">{{ page.title }}</h1>
    <div
      v-if="page.contentHtml"
      class="prose prose-neutral prose-lg max-w-none"
      v-html="page.contentHtml"
    />
  </div>
</template>
