/**
 * Shared language name mapping — used by translation composables and email generation.
 */

export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  nl: 'Dutch',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  pl: 'Polish',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese'
}

/**
 * Get full language name from locale code.
 * Falls back to uppercased code if unknown.
 */
export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] || code.toUpperCase()
}
