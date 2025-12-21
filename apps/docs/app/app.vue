<script setup lang="ts">
const { seo } = useAppConfig()

const { data: rawNavigation } = await useAsyncData('navigation', () => queryCollectionNavigation('docs'))
const { data: allSearchSections } = await useAsyncData('search-sections', () => queryCollectionSearchSections('docs'))

// Add changelogs to navigation
const navigation = computed(() => {
  if (!rawNavigation.value) return []
  return [
    ...rawNavigation.value,
    {
      title: 'Changelog Tracker',
      path: '/changelogs',
      icon: 'i-lucide-git-branch',
      children: []
    }
  ]
})

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

  // Add changelogs to search
  const sections = Array.from(pageMap.values())
  sections.push({
    id: '/changelogs',
    path: '/changelogs',
    title: 'Changelog Tracker',
    description: 'AI-summarized releases from key Nuxt ecosystem packages'
  })

  return sections
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
