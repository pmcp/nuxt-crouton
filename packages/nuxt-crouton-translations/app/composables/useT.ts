import { h } from 'vue'

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
  const { t, locale } = useI18n()
  const { currentTeam } = useTeam()
  const route = useRoute()
  const isDev = process.dev
  const devModeEnabled = useState('devMode.enabled', () => false)


  // Cache for team translations to avoid repeated API calls
  const teamTranslations = useState<Record<string, any>>('teamTranslations', () => ({}))
  const teamTranslationsLoaded = useState<boolean>('teamTranslationsLoaded', () => false)

  // Load team translations if not already loaded
  const loadTeamTranslations = async () => {
    if (!currentTeam.value?.slug || teamTranslationsLoaded.value) return

    try {
      const data = await $fetch(`/api/teams/${currentTeam.value.slug}/translations-ui/with-system`, {
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
      // Silently fail - team translations are optional
      console.debug('Failed to load team translations:', error)
    }
  }

  // Watch for team changes and reload translations
  watch(() => currentTeam.value?.slug, () => {
    teamTranslationsLoaded.value = false
    teamTranslations.value = {}
    loadTeamTranslations()
  }, { immediate: true })

  // Watch for locale changes and reload translations
  watch(locale, () => {
    teamTranslationsLoaded.value = false
    teamTranslations.value = {}
    loadTeamTranslations()
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
    const teamSlug = route.params.team as string | undefined
    const teamOverride = teamTranslations.value?.[key]

    if (teamOverride) {
      translatedValue = teamOverride
    } else {
      // Fall back to system translation
      const systemValue = params ? t(key, params as any) : t(key)

      // Check if translation is missing (i18n returns the key when not found)
      if (systemValue === key) {
        isTranslationMissing = true
        // Simple [key] format for missing translations
        translatedValue = fallback || placeholder || `[${key}]`
      } else {
        translatedValue = systemValue
      }
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
    const teamSlug = route.params.team as string | undefined
    const teamOverride = teamTranslations.value?.[key]
    const systemValue = t(key)
    const isTranslationMissing = systemValue === key

    return {
      key,
      value: translate(key, options),
      mode: teamSlug ? 'team' : 'system',
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
    } else {
      const systemValue = params ? t(key, params as any) : t(key)

      // Check if translation is missing
      if (systemValue === key) {
        value = fallback || placeholder || `[${key}]`
      } else {
        value = systemValue
      }
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

    const systemValue = t(key)
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
    systemLocales.forEach(loc => {
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
    const systemValue = t(key)
    const isSystemMissing = systemValue === key

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