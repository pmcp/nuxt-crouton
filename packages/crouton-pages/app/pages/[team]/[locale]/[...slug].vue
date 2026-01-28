<script setup lang="ts">
/**
 * Public Page Route with Locale
 *
 * Renders pages at /[team]/[locale]/[slug] URLs.
 * Supports custom domains via domain resolver middleware.
 *
 * URL patterns:
 * - /acme/en/about-us → team=acme, locale=en, slug=about-us
 * - /acme/fr/a-propos → team=acme, locale=fr, slug=a-propos
 * - /acme/nl/over-ons → team=acme, locale=nl, slug=over-ons
 *
 * Layout modes:
 * - default: Normal scrollable content with padding
 * - full-height: Fixed viewport height, content fills remaining space
 * - full-screen: No padding, full viewport
 *
 * Inline editing:
 * - Admins see a floating edit button (FAB) at bottom-right
 * - Clicking it opens a side-by-side editor via the public layout
 * - Live preview updates as the admin edits translations
 */
definePageMeta({
  layout: 'public'
})

// Share page layout with the layout component via useState (works across components)
const pageLayout = useState<'default' | 'full-height' | 'full-screen'>('pageLayout', () => 'default')

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

// Get translation function with fallback for SSR edge cases
// Wrap in try-catch to handle cases where the composable fails during SSR
let t: (key: string, options?: any) => string = (key: string) => `[${key}]`
try {
  const useTranslation = useT()
  if (typeof useTranslation?.t === 'function') {
    t = useTranslation.t
  }
} catch (error) {
  // useT failed during SSR - use fallback
  if (import.meta.dev) {
    console.warn('[crouton-pages] useT() failed, using fallback:', error)
  }
}
const { getPageType } = usePageTypes()
const { isCustomDomain, hideTeamInUrl } = useDomainContext()

// i18n for locale handling and SEO
const { locale: i18nLocale, locales, setLocale } = useI18n()

// Get team, locale, and slug from route params
const team = computed(() => route.params.team as string)
const urlLocale = computed(() => route.params.locale as string)
const slug = computed(() => {
  const slugParts = route.params.slug
  if (!slugParts || (Array.isArray(slugParts) && slugParts.length === 0)) {
    return '' // Homepage
  }
  return Array.isArray(slugParts) ? slugParts.join('/') : slugParts
})

// Validate locale from URL and sync with i18n
const validLocales = computed(() => locales.value.map((l: { code: string }) => l.code))
const isValidLocale = computed(() => validLocales.value.includes(urlLocale.value))

// If locale is invalid, throw 404
if (!isValidLocale.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page Not Found'
  })
}

// Sync URL locale with i18n locale
if (urlLocale.value !== i18nLocale.value) {
  setLocale(urlLocale.value)
}

// Build API URL - slug might be empty for homepage
const apiUrl = computed(() => {
  const baseUrl = `/api/teams/${team.value}/pages`
  // Always use slug endpoint - use '_home' for homepage (empty slug)
  // The API handles '_home' as "get first published root page"
  return `${baseUrl}/${slug.value || '_home'}`
})

// Fetch page by team and slug, passing current locale for translated slug lookup
const { data: pageResponse, status, error, refresh } = await useFetch(apiUrl, {
  query: { locale: urlLocale.value },
  watch: [team, slug, urlLocale],
  transform: (data: any) => data
})

// Extract page and meta from response
const page = computed(() => pageResponse.value?.data)
const pageMeta = computed(() => pageResponse.value?.meta)

// Get page type info (needed for layout fallback)
const pageType = computed(() => {
  if (!page.value) return null
  return getPageType(page.value.pageType || 'core:regular')
})

// Compute the desired layout based on page data
const desiredLayout = computed(() => {
  const p = page.value
  const pt = pageType.value

  if (p?.layout && p.layout !== 'default') {
    return p.layout as 'default' | 'full-height' | 'full-screen'
  } else if (pt?.preferredLayout) {
    return pt.preferredLayout as 'default' | 'full-height' | 'full-screen'
  }
  return 'default'
})

// Set layout whenever desiredLayout changes (handles SSR, hydration, and navigation)
watch(desiredLayout, (layout) => {
  pageLayout.value = layout
}, { immediate: true })

// Handle errors
if (error.value?.statusCode === 404) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page Not Found'
  })
}

// Handle 401 - redirect to login for members-only pages
if (error.value?.statusCode === 401) {
  navigateTo(`/auth/login?redirect=${encodeURIComponent(route.fullPath)}`)
}

// Check authentication for protected pages
const { user } = useSession()

// Redirect if auth required but user not logged in
watchEffect(() => {
  if (pageType.value?.requiresAuth && !user.value) {
    navigateTo(`/auth/login?redirect=${encodeURIComponent(route.fullPath)}`)
  }
})

// --- Inline editing ---

// Admin detection (useTeam may not be available if auth package not installed)
let isAdmin = ref(false)
try {
  const teamComposable = useTeam()
  isAdmin = teamComposable.isAdmin
} catch {
  // Auth package not installed or useTeam unavailable
}

// Shared editing state with layout
const isEditing = useState<boolean>('pageEditing', () => false)
const editingPageId = useState<string | null>('editingPageId', () => null)

// Shared translations from the editor for live preview
const editingTranslations = useState<Record<string, any> | null>('editingTranslations', () => null)

// Compute the page data to render — uses editor translations for live preview when editing
const previewPage = computed(() => {
  if (isEditing.value && editingTranslations.value && page.value) {
    return { ...page.value, translations: editingTranslations.value }
  }
  return page.value
})

function startEditing() {
  if (!page.value?.id) return
  editingPageId.value = page.value.id
  isEditing.value = true
}

// Refresh page data after save
watch(isEditing, async (editing, wasEditing) => {
  if (!editing && wasEditing) {
    // Editor was closed — refresh page data to pick up saved changes
    await refresh()
  }
})

// Clean up editing state on unmount
onBeforeUnmount(() => {
  isEditing.value = false
  editingPageId.value = null
  editingTranslations.value = null
})

// SEO meta
useSeoMeta({
  title: () => page.value?.seoTitle || page.value?.title || 'Page',
  description: () => page.value?.seoDescription || ''
})

// Build hreflang links for SEO
const alternateLinks = computed(() => {
  const translations = pageMeta.value?.translations
  if (!translations || !page.value) return []

  // Parse translations if string
  const parsedTranslations = typeof translations === 'string'
    ? JSON.parse(translations)
    : translations

  // Get base slug (English slug)
  const baseSlug = page.value.baseSlug || page.value.slug

  // Build alternate links for each locale: /team/locale/slug
  return locales.value.map((loc: { code: string }) => {
    const translatedSlug = parsedTranslations?.[loc.code]?.slug || baseSlug
    return {
      rel: 'alternate',
      hreflang: loc.code,
      href: `/${team.value}/${loc.code}/${translatedSlug}`
    }
  })
})

// Page title and hreflang links for head
useHead({
  title: () => page.value?.title || 'Page',
  link: () => [
    // Canonical URL: /team/locale/slug
    {
      rel: 'canonical',
      href: `/${team.value}/${urlLocale.value}/${page.value?.slug || ''}`
    },
    // hreflang alternatives
    ...alternateLinks.value
  ]
})
</script>

<template>
  <div class="page-view h-full">
    <!-- Loading -->
    <div v-if="status === 'pending'" class="flex justify-center items-center py-24">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-primary" />
    </div>

    <!-- Page content -->
    <template v-else-if="page">
      <CroutonPagesRenderer :page="previewPage" />
    </template>

    <!-- Error / Not found -->
    <template v-else>
      <div class="text-center py-24">
        <UIcon name="i-lucide-file-x" class="size-16 text-muted mb-6 mx-auto" />
        <h2 class="text-2xl font-semibold mb-2">{{ t('pages.notFound') || 'Page not found' }}</h2>
        <p class="text-muted mb-6">{{ t('pages.notFoundDescription') || 'The page you are looking for does not exist.' }}</p>
        <UButton :to="hideTeamInUrl ? '/' : `/${team}/${urlLocale}`" color="primary">
          <UIcon name="i-lucide-home" class="mr-2" />
          {{ t('pages.backToHome') || 'Back to Home' }}
        </UButton>
      </div>
    </template>

    <!-- Floating edit button (FAB) — admin only, hidden when editing -->
    <ClientOnly>
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-90"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-90"
      >
        <button
          v-if="isAdmin && !isEditing && page?.id"
          class="fixed bottom-6 right-6 z-40 flex items-center justify-center size-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer"
          @click="startEditing"
        >
          <UIcon name="i-lucide-pencil" class="size-5" />
        </button>
      </Transition>
    </ClientOnly>
  </div>
</template>
