<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()
const slug = route.params.page as string

const { data: page, error } = await useFetch(`/api/public/pages/${slug}`)

if (error.value) {
  throw createError({ status: 404, statusText: 'Page not found' })
}

// Redirect external link pages
if (page.value?.pageType === 'core:link' && page.value?.config?.url) {
  await navigateTo(page.value.config.url, { external: true })
}

useHead({
  title: page.value?.title ? `${page.value.title} — Alex Deforce` : 'Alex Deforce'
})
</script>

<template>
  <div v-if="page">
    <h1 class="pb-5 pt-1"><span class="text-xl">{{ page.title }}</span></h1>
    <div v-if="page.contentHtml" class="prose prose-sm" v-html="page.contentHtml" />
  </div>
</template>
