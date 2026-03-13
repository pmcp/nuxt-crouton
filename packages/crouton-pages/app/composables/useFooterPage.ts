/**
 * Footer Page Composable
 *
 * Fetches the singleton footer page (pageType: 'pages:footer') for the current team.
 * Returns parsed block content ready for rendering.
 *
 * @example
 * ```vue
 * <script setup>
 * const { footer, content, isLoading } = useFooterPage()
 * </script>
 *
 * <template>
 *   <CroutonPagesBlockContent v-if="content" :content="content" />
 * </template>
 * ```
 */
export function useFooterPage(teamSlug?: MaybeRef<string | null>) {
  const route = useRoute()
  const { locale: i18nLocale } = useI18n()
  const { teamId } = useTeamContext()

  const pagesConfig = (useRuntimeConfig().public?.croutonPages as any) as { defaultLocale?: string } | undefined
  const locale = computed(() => i18nLocale.value || pagesConfig?.defaultLocale || 'en')

  // Resolve team from prop, route, or auth context
  const routeTeam = computed(() => {
    const param = route.params.team
    if (typeof param !== 'string') return null
    return param
  })
  const team = computed(() => {
    const teamValue = toValue(teamSlug)
    if (teamValue) return teamValue
    return routeTeam.value || teamId.value || null
  })

  // Fetch footer page by pageType filter
  const { data: footerData, pending: isLoading, refresh } = useFetch(() => {
    if (!team.value) return null as any
    return `/api/teams/${team.value}/pages`
  }, {
    params: { pageType: 'pages:footer', locale },
    default: () => null,
    transform: (data: any) => {
      const pages = data?.data || data || []
      // Return first (singleton) footer page
      return pages[0] || null
    }
  })

  // Parsed footer page record
  const footer = computed(() => footerData.value)

  // Resolved content (locale-aware) — block JSON string or parsed object
  const content = computed(() => {
    const page = footer.value
    if (!page) return null

    // Try localized content from translations
    if (page.translations) {
      const localeContent = page.translations[locale.value]?.content
      if (localeContent) return localeContent
      // Fallback to English
      if (page.translations.en?.content) return page.translations.en.content
    }

    return page.content || null
  })

  // Refresh when pages are mutated
  const nuxtApp = useNuxtApp()
  nuxtApp.hook('crouton:mutation' as any, (event: any) => {
    if (event?.collection === 'pagesPages') {
      refresh()
    }
  })

  return {
    /** The raw footer page record (or null if none exists) */
    footer,
    /** Localized block content string ready for CroutonPagesBlockContent */
    content,
    /** Whether the footer is still loading */
    isLoading,
    /** Refresh the footer data */
    refresh
  }
}
