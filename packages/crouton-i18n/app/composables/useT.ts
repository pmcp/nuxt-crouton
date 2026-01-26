interface TranslationOptions {
  params?: Record<string, any>
  fallback?: string
  category?: string
  mode?: 'system' | 'team'
  placeholder?: string // What to show when translation is missing
}

/**
 * Translation composable with team override support and dev mode editing
 *
 * This composable provides a translation function that:
 * 1. First checks team-specific overrides
 * 2. Falls back to system translations
 * 3. Returns the key if no translation found
 * 4. In dev mode, wraps translations with DevTranslationWrapper for inline editing
 */
export function useT() {
  // Safely get i18n - it may not be available during SSR on some routes
  let i18n: ReturnType<typeof useI18n> | null = null
  try {
    i18n = useI18n()
  } catch (error) {
    // i18n not available, will use fallback behavior
    if (import.meta.dev) {
      console.warn('[useT] useI18n() not available, using fallback mode')
    }
  }

  // Use computed to ensure locale stays reactive, with fallback to 'en'
  const locale = computed(() => i18n?.locale?.value ?? 'en')

  // Safely get team context - may not be available on all routes
  let teamSlug: { value: string | null } = { value: null }
  try {
    const context = useTeamContext()
    teamSlug = context.teamSlug
  } catch (error) {
    // Team context not available, that's fine for public routes
  }

  const isDev = import.meta.dev
  const devModeEnabled = useState('devMode.enabled', () => false)

  // Get team slug from useTeamContext() - handles both useTeam() and route.params.team fallback
  const teamSlugFromRoute = computed(() => teamSlug.value ?? undefined)

  // Cache for team translations to avoid repeated API calls
  const teamTranslations = useState<Record<string, any>>('teamTranslations', () => ({}))
  const teamTranslationsLoaded = useState<boolean>('teamTranslationsLoaded', () => false)

  // Load team translations if not already loaded
  const loadTeamTranslations = async () => {
    if (!teamSlugFromRoute.value || teamTranslationsLoaded.value) {
      return
    }

    try {
      const data = await $fetch(`/api/teams/${teamSlugFromRoute.value}/translations-ui/with-system`, {
        query: { locale: locale.value }
      })

      if (data && Array.isArray(data)) {
        // Build a map of keyPath to values for quick lookup
        const translationMap: Record<string, string> = {}

        for (const item of data) {
          // Use team override if available, otherwise use system values
          const values = (item as any).teamValues || (item as any).systemValues
          if (values && values[locale.value]) {
            translationMap[item.keyPath] = values[locale.value]
          }
        }

        teamTranslations.value = translationMap
        teamTranslationsLoaded.value = true
      }
    } catch (error) {
      console.error('[useT] Failed to load team translations:', error)
    }
  }

  // Watch for team changes and reload translations
  // Only run with immediate: true on client or when we have a valid SSR request context
  // During unexpected SSR (e.g., refreshNuxtData triggers), we may not have proper context
  watch(teamSlugFromRoute, () => {
    teamTranslationsLoaded.value = false
    teamTranslations.value = {}
    // Only load translations in valid contexts
    if (import.meta.client) {
      loadTeamTranslations()
    } else if (import.meta.server) {
      // On server, only load if we have a valid request event context
      try {
        const event = useRequestEvent()
        if (event) {
          loadTeamTranslations()
        }
      } catch {
        // No request context available - skip loading on server
      }
    }
  }, { immediate: true })

  // Watch for locale changes and reload translations
  watch(locale, () => {
    teamTranslationsLoaded.value = false
    teamTranslations.value = {}
    // Only load translations in valid contexts (same protection as team watcher)
    if (import.meta.client) {
      loadTeamTranslations()
    } else if (import.meta.server) {
      try {
        const event = useRequestEvent()
        if (event) {
          loadTeamTranslations()
        }
      } catch {
        // No request context available - skip loading on server
      }
    }
  })

  /**
   * Enhanced translation function
   * @param key - Translation key (e.g., 'common.save')
   * @param options - Translation options
   * @returns Translated string
   */
  const translate = (key: string, options: TranslationOptions = {}): string => {
    const { params, fallback, category = 'ui', mode = 'team', placeholder } = options

    // Get the translated value
    let translatedValue: string
    let isTranslationMissing = false

    // Check team overrides first
    const currentTeamSlug = teamSlugFromRoute.value
    const teamOverride = teamTranslations.value?.[key]

    if (teamOverride) {
      translatedValue = teamOverride
    } else if (i18n) {
      // Fall back to system translation
      const systemValue = params ? i18n.t(key, params as any) : i18n.t(key)

      // Check if translation is missing (i18n returns the key when not found)
      if (systemValue === key) {
        isTranslationMissing = true
        // Simple [key] format for missing translations
        translatedValue = fallback || placeholder || `[${key}]`
      } else {
        translatedValue = systemValue
      }
    } else {
      // i18n not available - use fallback or key
      isTranslationMissing = true
      translatedValue = fallback || placeholder || `[${key}]`
    }

    // Apply parameter substitution
    if (params && translatedValue) {
      translatedValue = translatedValue.replace(/\{(\w+)\}/g, (_, k) => params[k] || '')
    }

    return translatedValue
  }

  /**
   * Get translation metadata for dev mode
   * @param key - Translation key
   * @param options - Translation options
   * @returns Translation metadata
   */
  const getTranslationInfo = (key: string, options: TranslationOptions = {}) => {
    const { category = 'ui' } = options
    const currentTeamSlug = teamSlugFromRoute.value
    const teamOverride = teamTranslations.value?.[key]
    const systemValue = i18n ? i18n.t(key) : key
    const isTranslationMissing = !i18n || systemValue === key

    return {
      key,
      value: translate(key, options),
      mode: currentTeamSlug ? 'team' : 'system',
      category,
      isMissing: isTranslationMissing,
      hasTeamOverride: !!teamOverride
    }
  }

  /**
   * Simple string-only version for cases where VNode isn't supported
   * @param key - Translation key (e.g., 'common.save')
   * @param options - Translation options
   * @returns Translated string
   */
  const translateString = (key: string, options: TranslationOptions = {}): string => {
    const { params, fallback, placeholder } = options

    // Get team overrides
    const teamOverride = teamTranslations.value?.[key]

    let value: string

    if (teamOverride) {
      value = teamOverride
    } else if (i18n) {
      const systemValue = params ? i18n.t(key, params as any) : i18n.t(key)

      // Check if translation is missing
      if (systemValue === key) {
        value = fallback || placeholder || `[${key}]`
      } else {
        value = systemValue
      }
    } else {
      // i18n not available - use fallback or key
      value = fallback || placeholder || `[${key}]`
    }

    // Apply parameter substitution
    if (params && value) {
      value = value.replace(/\{(\w+)\}/g, (_, k) => params[k] || '')
    }

    return value
  }

  /**
   * Reactive translation for content fields
   * @param entity - Entity with translations
   * @param field - Field name to translate
   * @param preferredLocale - Preferred locale (optional)
   * @returns Translated content
   */
  const translateContent = (
    entity: any,
    field: string,
    preferredLocale?: string
  ): string => {
    const loc = preferredLocale || locale.value

    // Try requested locale
    const translated = entity?.translations?.[loc]?.[field]
    if (translated) return translated

    // Try fallback locales
    const fallbacks = ['en', 'nl', 'fr']
    for (const fallbackLoc of fallbacks) {
      if (fallbackLoc === loc) continue // Skip the already tried locale
      const fallbackValue = entity?.translations?.[fallbackLoc]?.[field]
      if (fallbackValue) return fallbackValue
    }

    // Final fallback to the field itself
    return entity?.[field] || ''
  }

  /**
   * Check if a translation exists
   * @param key - Translation key
   * @returns Boolean indicating if translation exists
   */
  const hasTranslation = (key: string): boolean => {
    const teamOverride = teamTranslations.value?.[key]

    if (teamOverride) return true

    if (!i18n) return false

    const systemValue = i18n.t(key)
    return systemValue !== key
  }

  /**
   * Get all available locales for a translation key
   * @param key - Translation key
   * @returns Array of available locale codes
   */
  const getAvailableLocales = (key: string): string[] => {
    const availableLocales: string[] = []

    // Check system translations (simplified - you'd need to implement this)
    const systemLocales = ['en', 'nl', 'fr'] // Your supported locales
    systemLocales.forEach((loc) => {
      // For now, just assume it exists if not already in availableLocales
      if (!availableLocales.includes(loc)) {
        availableLocales.push(loc)
      }
    })

    return availableLocales
  }

  /**
   * Get translation with metadata (useful for admin interfaces)
   * @param key - Translation key
   * @returns Translation metadata
   */
  const getTranslationMeta = (key: string) => {
    const teamOverride = teamTranslations.value?.[key]
    const systemValue = i18n ? i18n.t(key) : key
    const isSystemMissing = !i18n || systemValue === key

    return {
      key,
      value: teamOverride || systemValue,
      hasTeamOverride: !!teamOverride,
      isSystemMissing,
      availableLocales: getAvailableLocales(key)
    }
  }

  // Also expose a method to invalidate cache
  const refreshTranslations = async () => {
    teamTranslationsLoaded.value = false
    await loadTeamTranslations()
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
    locale,
    isDev,
    devModeEnabled
  }
}
