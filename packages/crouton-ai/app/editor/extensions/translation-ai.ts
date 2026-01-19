/**
 * TranslationAI TipTap Extension
 *
 * Provides AI-powered translation suggestions within the editor.
 *
 * Features:
 * - Keyboard shortcut: Cmd/Ctrl+J to trigger translation
 * - Tab to accept suggestion
 * - Escape to dismiss suggestion
 * - Ghost text preview using ProseMirror decorations
 *
 * @example
 * ```ts
 * import { TranslationAI } from '@fyit/crouton-ai/editor'
 *
 * const editor = useEditor({
 *   extensions: [
 *     TranslationAI.configure({
 *       getContext: () => ({
 *         sourceText: selectedText,
 *         sourceLanguage: 'en',
 *         targetLanguage: 'nl'
 *       }),
 *       onAccept: (text) => console.log('Accepted:', text)
 *     })
 *   ]
 * })
 * ```
 */
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { TranslationContext, TranslationSuggestion } from '../../types/translation'

export interface TranslationAIOptions {
  /**
   * Function that returns the current translation context
   * Called when translation is triggered
   */
  getContext: () => TranslationContext | null

  /**
   * Callback when a translation is accepted
   */
  onAccept?: (text: string) => void

  /**
   * Enable keyboard shortcut (Mod-j)
   * @default true
   */
  enableKeyboardShortcut?: boolean

  /**
   * API endpoint for translation
   * @default '/api/ai/translate'
   */
  api?: string
}

// Plugin key for managing state
const translationPluginKey = new PluginKey('translationAI')

// Extension state interface
interface TranslationState {
  suggestion: TranslationSuggestion | null
  isLoading: boolean
  position: number | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    translationAI: {
      /**
       * Trigger a translation suggestion
       */
      triggerTranslationSuggestion: () => ReturnType
      /**
       * Accept the current translation suggestion
       */
      acceptTranslationSuggestion: () => ReturnType
      /**
       * Dismiss the current translation suggestion
       */
      dismissTranslationSuggestion: () => ReturnType
    }
  }
}

/**
 * Fetch translation from API
 */
async function fetchTranslation(
  context: TranslationContext,
  api: string
): Promise<TranslationSuggestion | null> {
  try {
    const response = await fetch(api, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sourceText: context.sourceText,
        sourceLanguage: context.sourceLanguage || 'en',
        targetLanguage: context.targetLanguage,
        fieldType: context.fieldType,
        existingTranslations: context.existingTranslations,
        customInstructions: context.customInstructions
      })
    })

    if (!response.ok) {
      throw new Error('Translation request failed')
    }

    return await response.json()
  } catch (error) {
    console.error('Translation error:', error)
    return null
  }
}

export const TranslationAI = Extension.create<TranslationAIOptions>({
  name: 'translationAI',

  addOptions() {
    return {
      getContext: () => null,
      onAccept: undefined,
      enableKeyboardShortcut: true,
      api: '/api/ai/translate'
    }
  },

  addStorage() {
    return {
      suggestion: null as TranslationSuggestion | null,
      isLoading: false,
      position: null as number | null
    }
  },

  addCommands() {
    return {
      triggerTranslationSuggestion:
        () =>
        ({ editor, tr }) => {
          const context = this.options.getContext()
          if (!context || !context.sourceText) {
            return false
          }

          // Store current position for ghost text
          this.storage.position = tr.selection.from
          this.storage.isLoading = true

          // Get API endpoint from options
          const api = this.options.api || '/api/ai/translate'

          // Fetch translation asynchronously
          fetchTranslation(context, api).then((suggestion: TranslationSuggestion | null) => {
            if (suggestion) {
              this.storage.suggestion = suggestion
              this.storage.isLoading = false
              // Force view update by dispatching a transaction
              editor.view.dispatch(editor.view.state.tr)
            } else {
              this.storage.isLoading = false
            }
          })

          return true
        },

      acceptTranslationSuggestion:
        () =>
        ({ editor, tr, dispatch }) => {
          const suggestion = this.storage.suggestion
          if (!suggestion) {
            return false
          }

          if (dispatch) {
            // Get the selected text range
            const { from, to } = tr.selection

            // Replace selection with translated text
            const transaction = tr.replaceWith(
              from,
              to,
              editor.schema.text(suggestion.text)
            )
            dispatch(transaction)

            // Trigger callback
            this.options.onAccept?.(suggestion.text)

            // Clear state
            this.storage.suggestion = null
            this.storage.position = null
          }

          return true
        },

      dismissTranslationSuggestion:
        () =>
        () => {
          if (!this.storage.suggestion) {
            return false
          }

          // Clear state
          this.storage.suggestion = null
          this.storage.position = null
          this.storage.isLoading = false

          return true
        }
    }
  },

  addKeyboardShortcuts() {
    const shortcuts: Record<string, () => boolean> = {}

    if (!this.options.enableKeyboardShortcut) {
      return shortcuts
    }

    // Cmd/Ctrl+J to trigger translation
    shortcuts['Mod-j'] = () => {
      if (this.storage.suggestion) {
        // If already showing suggestion, dismiss it
        return this.editor.commands.dismissTranslationSuggestion()
      }
      return this.editor.commands.triggerTranslationSuggestion()
    }

    // Tab to accept suggestion
    shortcuts['Tab'] = () => {
      if (this.storage.suggestion) {
        return this.editor.commands.acceptTranslationSuggestion()
      }
      return false
    }

    // Escape to dismiss suggestion
    shortcuts['Escape'] = () => {
      if (this.storage.suggestion) {
        return this.editor.commands.dismissTranslationSuggestion()
      }
      return false
    }

    return shortcuts
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: translationPluginKey,

        state: {
          init(): TranslationState {
            return {
              suggestion: null,
              isLoading: false,
              position: null
            }
          },

          apply(_tr, _value): TranslationState {
            // Sync with extension storage
            return {
              suggestion: extension.storage.suggestion,
              isLoading: extension.storage.isLoading,
              position: extension.storage.position
            }
          }
        },

        props: {
          decorations(state) {
            const { suggestion, position } = extension.storage

            if (!suggestion || position === null) {
              return DecorationSet.empty
            }

            // Create ghost text decoration
            const ghostWidget = Decoration.widget(
              position,
              () => {
                const span = document.createElement('span')
                span.className = 'translation-suggestion-ghost'
                span.textContent = suggestion.text
                span.title = 'Press Tab to accept, Escape to dismiss'
                return span
              },
              { side: 1 }
            )

            return DecorationSet.create(state.doc, [ghostWidget])
          }
        }
      })
    ]
  }
})

export default TranslationAI
