<script setup lang="ts">
const { seo } = useAppConfig()

const { data: navigation } = await useAsyncData('navigation', () => queryCollectionNavigation('docs'))
const { data: allSearchSections } = await useAsyncData('search-sections', () => queryCollectionSearchSections('docs'))

// Group search sections by page path and keep only the first (main) section per page
const searchSections = computed(() => {
  if (!allSearchSections.value) return []

  // Group by page path (sections have format like /getting-started#heading)
  const pageMap = new Map()

  allSearchSections.value.forEach((section: any) => {
    // Extract base path without hash/anchor
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

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  titleTemplate: `%s - ${seo?.siteName}`,
  ogSiteName: seo?.siteName,
  twitterCard: 'summary_large_image'
})

provide('navigation', navigation)
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <AppHeader />

    <UMain>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </UMain>

    <AppFooter />

    <ClientOnly>
      <LazyUContentSearch
        :files="searchSections"
        :navigation="navigation"
      />
    </ClientOnly>
  </UApp>
</template>
