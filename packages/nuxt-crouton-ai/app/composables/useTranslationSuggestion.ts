/**
 * useTranslationSuggestion composable
 *
 * Provides AI-powered translation suggestions for text content.
 * Designed for use with CroutonI18nInput and CroutonEditorSimple.
 *
 * @example
 * ```ts
 * const { suggestion, isLoading, suggest, accept, clear } = useTranslationSuggestion()
 *
 * // Request a translation
 * await suggest({
 *   sourceText: 'Hello world',
 *   sourceLanguage: 'en',
 *   targetLanguage: 'nl',
 *   fieldType: 'product_name'
 * })
 *
 * // Use the suggestion
 * if (suggestion.value) {
 *   console.log(suggestion.value.text) // "Hallo wereld"
 *   accept() // Emits the accepted text
 * }
 * ```
 */
import { ref } from 'vue'
import type {
  TranslationContext,
  TranslationSuggestion,
  TranslationSuggestionOptions
} from '../types/translation'

/**
 * Composable for AI-powered translation suggestions
 */
export function useTranslationSuggestion(options: TranslationSuggestionOptions = {}) {
  const {
    api = '/api/ai/translate',
    model,
    onComplete,
    onError
  } = options

  // State
  const suggestion = ref<TranslationSuggestion | null>(null)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  // Last context for retrying
  const lastContext = ref<TranslationContext | null>(null)

  /**
   * Request a translation suggestion
   */
  async function suggest(context: TranslationContext): Promise<TranslationSuggestion | null> {
    // Validate context
    if (!context.sourceText || !context.targetLanguage) {
      const err = new Error('sourceText and targetLanguage are required')
      error.value = err
      onError?.(err)
      return null
    }

    // Don't translate to same language
    if (context.sourceLanguage === context.targetLanguage) {
      const result = { text: context.sourceText, confidence: 1 }
      suggestion.value = result
      onComplete?.(result)
      return result
    }

    // Store context for retry
    lastContext.value = context

    // Reset state
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<TranslationSuggestion>(api, {
        method: 'POST',
        body: {
          sourceText: context.sourceText,
          sourceLanguage: context.sourceLanguage || 'en',
          targetLanguage: context.targetLanguage,
          fieldType: context.fieldType,
          existingTranslations: context.existingTranslations,
          customInstructions: context.customInstructions,
          model
        }
      })

      suggestion.value = response
      onComplete?.(response)
      return response
    } catch (err: any) {
      const translationError = new Error(err.message || 'Translation failed')
      error.value = translationError
      suggestion.value = null
      onError?.(translationError)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Clear the current suggestion
   */
  function clear() {
    suggestion.value = null
    error.value = null
  }

  /**
   * Accept the current suggestion (returns the text)
   */
  function accept(): string | null {
    if (!suggestion.value) return null
    const text = suggestion.value.text
    clear()
    return text
  }

  /**
   * Retry the last translation request
   */
  async function retry(): Promise<TranslationSuggestion | null> {
    if (!lastContext.value) return null
    return suggest(lastContext.value)
  }

  return {
    // State
    suggestion,
    isLoading,
    error,

    // Actions
    suggest,
    clear,
    accept,
    retry
  }
}

// Re-export types for convenience
export type { TranslationContext, TranslationSuggestion, TranslationSuggestionOptions }
