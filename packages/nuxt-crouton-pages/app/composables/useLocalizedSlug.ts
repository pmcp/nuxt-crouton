/**
 * Composable for handling localized page slugs
 *
 * Provides utilities for:
 * - Getting the translated slug for a specific locale
 * - Switching to a different locale with the correct translated slug URL
 * - Building localized page URLs
 */
export function useLocalizedSlug() {
  const { locale } = useI18n()

  /**
   * Get the slug for a specific locale from a page object
   * Falls back to the base (English) slug if translation not available
   */
  function getSlugForLocale(page: any, targetLocale: string): string {
    if (!page) return ''

    // Parse translations if string
    const translations = typeof page.translations === 'string'
      ? JSON.parse(page.translations)
      : page.translations

    // Try to get locale-specific slug, fallback to base slug
    return translations?.[targetLocale]?.slug || page.baseSlug || page.slug || ''
  }

  /**
   * Build the full URL for a page in a specific locale
   */
  function getLocalizedUrl(page: any, targetLocale: string): string {
    const slug = getSlugForLocale(page, targetLocale)
    const teamSlug = page.teamSlug || page.meta?.teamSlug || ''

    if (!teamSlug) {
      console.warn('[useLocalizedSlug] Page missing teamSlug')
      return `/${targetLocale}/${slug}`
    }

    return `/${targetLocale}/${teamSlug}/${slug}`
  }

  /**
   * Switch to a different locale for the current page
   * Returns the URL for the page in the target locale
   */
  function switchToLocale(page: any, targetLocale: string): string {
    return getLocalizedUrl(page, targetLocale)
  }

  /**
   * Get all available locale URLs for a page (useful for language switchers)
   */
  function getAllLocaleUrls(page: any, locales: Array<{ code: string }>): Array<{ locale: string; url: string }> {
    return locales.map(loc => ({
      locale: loc.code,
      url: getLocalizedUrl(page, loc.code)
    }))
  }

  /**
   * Check if a page has a translated slug for a specific locale
   */
  function hasTranslatedSlug(page: any, targetLocale: string): boolean {
    if (!page?.translations) return false

    const translations = typeof page.translations === 'string'
      ? JSON.parse(page.translations)
      : page.translations

    return !!translations?.[targetLocale]?.slug
  }

  return {
    getSlugForLocale,
    getLocalizedUrl,
    switchToLocale,
    getAllLocaleUrls,
    hasTranslatedSlug,
    currentLocale: locale
  }
}
