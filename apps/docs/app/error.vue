<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{
  error: NuxtError
}>()

useHead({
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  title: 'Page not found',
  description: 'We are sorry but this page could not be found.'
})

const { data: navigation } = await useAsyncData('navigation', () => queryCollectionNavigation('docs'))
const { data: allSearchSections } = await useAsyncData('search-sections', () => queryCollectionSearchSections('docs'))

// Group search sections by page path
const searchSections = computed(() => {
  if (!allSearchSections.value) return []

  const pageMap = new Map()

  allSearchSections.value.forEach((section: any) => {
    const basePath = section.id?.split('#')[0] || section.path?.split('#')[0] || section.id || section.path

    if (basePath && !pageMap.has(basePath)) {
      pageMap.set(basePath, {
        ...section,
        id: basePath,
        path: basePath
      })
    }
  })

  return Array.from(pageMap.values())
})

provide('navigation', navigation)
</script>

<template>
  <UApp>
    <AppHeader />

    <UError :error="error" />

    <AppFooter />

    <ClientOnly>
      <LazyUContentSearch
        :files="searchSections"
        :navigation="navigation"
      />
    </ClientOnly>
  </UApp>
</template>
