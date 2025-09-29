import { eq } from 'drizzle-orm'
import { teamSettings } from '../database/schema/teamSettings'
import en from '../../locales/en.json'
import nl from '../../locales/nl.json'
import fr from '../../locales/fr.json'

const systemTranslations: Record<string, any> = { en, nl, fr }

/**
 * Get a translation with team override support
 * Fallback chain: Team override → System translation → English → Key
 */
export async function getTranslation(
  locale: string,
  key: string,
  teamId?: string
): Promise<string> {
  // Check team overrides if teamId provided
  if (teamId) {
    try {
      const db = useDB()
      const settings = await db
        .select()
        .from(teamSettings)
        .where(eq(teamSettings.teamId, teamId))
        .get()

      const override = settings?.translations?.[locale]?.[key]
      if (override) return override
    } catch (error) {
      // Team settings table might not exist or DB might not be configured
      // Silently fall back to system translations
      console.debug('Team translations not available:', error)
    }
  }

  // Navigate nested keys (e.g., "auth.login")
  const keys = key.split('.')
  let value: any = systemTranslations[locale] || systemTranslations['en']

  for (const k of keys) {
    value = value?.[k]
    if (value === undefined) break
  }

  // If not found in requested locale, try English
  if (value === undefined && locale !== 'en') {
    value = systemTranslations['en']
    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) break
    }
  }

  return value || key
}

/**
 * Get multiple translations at once
 */
export async function getTranslations(
  locale: string,
  keys: string[],
  teamId?: string
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}

  // If teamId provided, fetch team settings once
  let teamTranslations: Record<string, any> | undefined
  if (teamId) {
    try {
      const db = useDB()
      const settings = await db
        .select()
        .from(teamSettings)
        .where(eq(teamSettings.teamId, teamId))
        .get()
      teamTranslations = settings?.translations?.[locale]
    } catch (error) {
      // Team settings table might not exist or DB might not be configured
      // Silently fall back to system translations
      console.debug('Team translations not available:', error)
    }
  }

  for (const key of keys) {
    // Check team override first
    if (teamTranslations?.[key]) {
      result[key] = teamTranslations[key]
      continue
    }

    // Fall back to system translation
    const keys = key.split('.')
    let value: any = systemTranslations[locale] || systemTranslations['en']

    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) break
    }

    // If not found in requested locale, try English
    if (value === undefined && locale !== 'en') {
      value = systemTranslations['en']
      for (const k of keys) {
        value = value?.[k]
        if (value === undefined) break
      }
    }

    result[key] = value || key
  }

  return result
}

/**
 * Simple template replacement for translations
 */
export function interpolateTranslation(
  template: string,
  params: Record<string, any>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    params[key]?.toString() || ''
  )
}

/**
 * Get all available locales
 */
export function getAvailableLocales(): string[] {
  return Object.keys(systemTranslations)
}

/**
 * Check if a locale is supported
 */
export function isLocaleSupported(locale: string): boolean {
  return locale in systemTranslations
}
