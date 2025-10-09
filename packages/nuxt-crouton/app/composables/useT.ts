/**
 * Stub translation composable for base nuxt-crouton layer
 *
 * This provides a simple fallback that returns keys as-is when the
 * @friendlyinternet/nuxt-crouton-i18n layer is not installed.
 *
 * When the i18n layer IS installed, it will override this stub
 * with full i18n functionality.
 */
export function useT() {
  /**
   * Simple translation function that returns the key as-is
   * @param key - Translation key (e.g., 'common.save')
   * @param options - Translation options (ignored in stub)
   * @returns The key itself (no translation)
   */
  const translate = (key: string, options?: any): string => {
    // For common UI patterns, provide basic English fallbacks
    const fallbacks: Record<string, string> = {
      'table.search': 'Search',
      'table.selectAll': 'Select all',
      'table.selectRow': 'Select row',
      'table.createdAt': 'Created At',
      'table.updatedAt': 'Updated At',
      'table.createdBy': 'Created By',
      'table.updatedBy': 'Updated By',
      'table.actions': 'Actions',
      'table.display': 'Display',
      'table.rowsPerPage': 'Rows per page',
      'table.rowsPerPageColon': 'Rows per page:',
      'table.showing': 'Showing',
      'table.to': 'to',
      'table.of': 'of',
      'table.results': 'results',
      'common.loading': 'Loading',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.create': 'Create',
      'common.update': 'Update'
    }

    return fallbacks[key] || key
  }

  /**
   * String-only version (same as translate for stub)
   */
  const translateString = (key: string, options?: any): string => {
    return translate(key, options)
  }

  /**
   * Content translation (returns empty string for stub)
   */
  const translateContent = (entity: any, field: string, preferredLocale?: string): string => {
    return entity?.[field] || ''
  }

  /**
   * Translation info (minimal stub)
   */
  const getTranslationInfo = (key: string, options?: any) => {
    return {
      key,
      value: translate(key, options),
      mode: 'system' as const,
      category: 'ui',
      isMissing: false,
      hasTeamOverride: false
    }
  }

  /**
   * Check if translation exists (always false for stub)
   */
  const hasTranslation = (key: string): boolean => {
    return false
  }

  /**
   * Get available locales (only 'en' for stub)
   */
  const getAvailableLocales = (key: string): string[] => {
    return ['en']
  }

  /**
   * Get translation metadata (minimal stub)
   */
  const getTranslationMeta = (key: string) => {
    return {
      key,
      value: translate(key),
      hasTeamOverride: false,
      isSystemMissing: true,
      availableLocales: ['en']
    }
  }

  /**
   * Refresh translations (no-op for stub)
   */
  const refreshTranslations = async () => {
    // No-op
  }

  return {
    t: translate,
    tString: translateString,
    tContent: translateContent,
    tInfo: getTranslationInfo,
    hasTranslation,
    getAvailableLocales,
    getTranslationMeta,
    refreshTranslations,
    locale: ref('en'),
    isDev: false,
    devModeEnabled: ref(false)
  }
}