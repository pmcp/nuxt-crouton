<script setup lang="ts">
/**
 * Public Page Catch-All Route
 *
 * Renders pages at /[team]/[slug] URLs.
 * Supports custom domains via domain resolver middleware.
 *
 * URL patterns:
 * - Direct: example.com/acme/about → team=acme, slug=about
 * - Custom domain: booking.acme.com/about → resolved to team=acme via middleware
 */
definePageMeta({
  layout: 'public'
})

const route = useRoute()

// Reserved prefixes that should NOT be treated as team slugs
// These routes are handled by other packages (auth, admin, etc.)
const reservedPrefixes = ['auth', 'api', 'admin', 'dashboard', '_nuxt', '__nuxt']
const teamParam = route.params.team as string

if (reservedPrefixes.includes(teamParam)) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page Not Found'
  })
}

const { t } = useT()
const { getPageType } = usePageTypes()
const { isCustomDomain, hideTeamInUrl } = useDomainContext()

// Get team and slug from route params
const team = computed(() => route.params.team as string)
const slug = computed(() => {
  const slugParts = route.params.slug
  if (!slugParts || (Array.isArray(slugParts) && slugParts.length === 0)) {
    return '' // Homepage
  }
  return Array.isArray(slugParts) ? slugParts.join('/') : slugParts
})

// Build API URL - slug might be empty for homepage
const apiUrl = computed(() => {
  const baseUrl = `/api/teams/${team.value}/pages`
  // Use the slug endpoint if we have a slug, otherwise get by empty slug
  return slug.value ? `${baseUrl}/${encodeURIComponent(slug.value)}` : `${baseUrl}/`
})

// Fetch page by team and slug
const { data: pageResponse, status, error } = await useFetch(apiUrl, {
  watch: [team, slug],
  transform: (data: any) => data?.data || data
})

// Extract page from response
const page = computed(() => pageResponse.value)

// Handle 404
if (error.value?.statusCode === 404) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page Not Found'
  })
}

// Get page type info
const pageType = computed(() => {
  if (!page.value) return null
  return getPageType(page.value.pageType || 'core:regular')
})

// Check authentication for protected pages
const { user } = useSession()

// Redirect if auth required but user not logged in
watchEffect(() => {
  if (pageType.value?.requiresAuth && !user.value) {
    navigateTo(`/auth/login?redirect=${encodeURIComponent(route.fullPath)}`)
  }
})

// SEO meta
useSeoMeta({
  title: () => page.value?.seoTitle || page.value?.title || 'Page',
  description: () => page.value?.seoDescription || ''
})

// Page title for head
useHead({
  title: () => page.value?.title || 'Page'
})
</script>

<template>
  <div class="page-view min-h-screen">
    <!-- Loading -->
    <div v-if="status === 'pending'" class="flex justify-center items-center py-24">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-primary" />
    </div>

    <!-- Page content -->
    <template v-else-if="page">
      <!-- Page header (optional - can be removed if pages handle their own) -->
      <header v-if="page.title && pageType?.id === 'regular'" class="border-b border-default">
        <div class="max-w-4xl mx-auto px-4 py-8">
          <h1 class="text-3xl font-bold">{{ page.title }}</h1>
        </div>
      </header>

      <!-- Page content -->
      <main class="max-w-4xl mx-auto">
        <CroutonPagesRenderer :page="page" />
      </main>
    </template>

    <!-- Error / Not found -->
    <template v-else>
      <div class="text-center py-24">
        <UIcon name="i-lucide-file-x" class="size-16 text-muted mb-6 mx-auto" />
        <h2 class="text-2xl font-semibold mb-2">{{ t('pages.notFound') || 'Page not found' }}</h2>
        <p class="text-muted mb-6">{{ t('pages.notFoundDescription') || 'The page you are looking for does not exist.' }}</p>
        <UButton :to="hideTeamInUrl ? '/' : `/${team}`" color="primary">
          <UIcon name="i-lucide-home" class="mr-2" />
          {{ t('pages.backToHome') || 'Back to Home' }}
        </UButton>
      </div>
    </template>
  </div>
</template>
