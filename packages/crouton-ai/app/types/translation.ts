/**
 * Types for AI-powered translation suggestions
 */

/**
 * Context provided to the AI for translation
 */
export interface TranslationContext {
  /** The source text to translate */
  sourceText: string
  /** Source language code (e.g., 'en') */
  sourceLanguage: string
  /** Target language code (e.g., 'nl', 'fr') */
  targetLanguage: string
  /** Optional field type for context (e.g., 'product_name', 'description') */
  fieldType?: string
  /** Existing translations in other languages for consistency */
  existingTranslations?: Record<string, string>
  /** Custom instructions to append to the prompt */
  customInstructions?: string
}

/**
 * Response from the translation suggestion API
 */
export interface TranslationSuggestion {
  /** The translated text */
  text: string
  /** Confidence score (0-1) if provided by the model */
  confidence?: number
  /** Alternative translations if multiple options exist */
  alternatives?: string[]
}

/**
 * Options for the useTranslationSuggestion composable
 */
export interface TranslationSuggestionOptions {
  /** API endpoint (default: '/api/ai/translate') */
  api?: string
  /** Model to use (default: 'gpt-4o-mini') */
  model?: string
  /** Callback when translation completes */
  onComplete?: (suggestion: TranslationSuggestion) => void
  /** Callback when an error occurs */
  onError?: (error: Error) => void
}

// Re-export from shared (single source of truth for both client and server)
export { LANGUAGE_NAMES, getLanguageName } from '../../shared/utils/language-names'
