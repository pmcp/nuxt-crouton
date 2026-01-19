<script setup lang="ts">
/**
 * CroutonEditorSimple
 *
 * A simple rich text editor following the Nuxt UI Editor pattern.
 * Uses UEditor + UEditorToolbar with sensible defaults.
 *
 * Based on: https://github.com/nuxt-ui-templates/editor
 */
import type { EditorToolbarItem } from '@nuxt/ui'
import type { Editor } from '@tiptap/vue-3'

/**
 * Translation context for AI-powered translation suggestions
 */
interface TranslationContext {
  sourceText: string
  sourceLanguage: string
  targetLanguage: string
  fieldType?: string
  existingTranslations?: Record<string, string>
  customInstructions?: string
}

interface Props {
  modelValue?: string | null
  placeholder?: string
  contentType?: 'html' | 'markdown' | 'json'
  editable?: boolean
  autofocus?: boolean | 'start' | 'end' | 'all' | number
  showToolbar?: boolean
  showBubbleToolbar?: boolean
  extensions?: any[]
  /** Enable AI translation suggestions (requires @fyit/crouton-ai) */
  enableTranslationAI?: boolean
  /** Translation context for AI suggestions */
  translationContext?: TranslationContext
  /** Callback when translation is accepted */
  onTranslationAccept?: (text: string) => void
}

const props = withDefaults(defineProps<Props>(), {
  contentType: 'html',
  editable: true,
  showToolbar: true,
  showBubbleToolbar: true,
  enableTranslationAI: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'create': [{ editor: Editor }]
  'update': [{ editor: Editor }]
  'translationAccept': [text: string]
}>()

const model = computed({
  get: () => props.modelValue || '',
  set: value => emit('update:modelValue', value)
})

// Track the editor instance for translation commands
const editorInstance = ref<Editor | null>(null)
const isTranslating = ref(false)

// Build extensions list with optional TranslationAI
const allExtensions = computed(() => {
  const ext = [...(props.extensions || [])]

  // TranslationAI extension is added dynamically when enabled
  // The extension itself is provided by the parent component or via props.extensions
  // We don't import it directly to avoid hard dependency on crouton-ai

  return ext
})

// Handle translation trigger from toolbar button
async function triggerTranslation() {
  if (!editorInstance.value || !props.translationContext) return

  // Check if editor has TranslationAI extension
  if (editorInstance.value.commands.triggerTranslationSuggestion) {
    editorInstance.value.commands.triggerTranslationSuggestion()
  } else {
    // Fallback: Call API directly for editors without the extension
    await translateSelectedText()
  }
}

// Direct translation (fallback when extension not available)
async function translateSelectedText() {
  if (!editorInstance.value || !props.translationContext) return

  const { from, to } = editorInstance.value.state.selection
  const selectedText = editorInstance.value.state.doc.textBetween(from, to)

  if (!selectedText) return

  isTranslating.value = true

  try {
    const result = await $fetch<{ text: string }>('/api/ai/translate', {
      method: 'POST',
      body: {
        sourceText: selectedText,
        sourceLanguage: props.translationContext.sourceLanguage || 'en',
        targetLanguage: props.translationContext.targetLanguage,
        fieldType: props.translationContext.fieldType,
        existingTranslations: props.translationContext.existingTranslations,
        customInstructions: props.translationContext.customInstructions
      }
    })

    if (result?.text) {
      // Replace selection with translated text
      editorInstance.value
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent(result.text)
        .run()

      emit('translationAccept', result.text)
      props.onTranslationAccept?.(result.text)
    }
  } catch (err) {
    console.error('Translation error:', err)
  } finally {
    isTranslating.value = false
  }
}

// Store editor instance on create
function handleEditorCreate(event: { editor: Editor }) {
  editorInstance.value = event.editor
  emit('create', event)
}

// Base toolbar items (always visible at top)
const baseToolbarItems: EditorToolbarItem[][] = [
  // Undo/Redo
  [
    { kind: 'undo', icon: 'i-lucide-undo', tooltip: { text: 'Undo' } },
    { kind: 'redo', icon: 'i-lucide-redo', tooltip: { text: 'Redo' } }
  ],
  // Block types
  [
    {
      icon: 'i-lucide-heading',
      tooltip: { text: 'Headings' },
      content: { align: 'start' },
      items: [
        { kind: 'heading', level: 1, icon: 'i-lucide-heading-1', label: 'Heading 1' },
        { kind: 'heading', level: 2, icon: 'i-lucide-heading-2', label: 'Heading 2' },
        { kind: 'heading', level: 3, icon: 'i-lucide-heading-3', label: 'Heading 3' }
      ]
    },
    {
      icon: 'i-lucide-list',
      tooltip: { text: 'Lists' },
      content: { align: 'start' },
      items: [
        { kind: 'bulletList', icon: 'i-lucide-list', label: 'Bullet List' },
        { kind: 'orderedList', icon: 'i-lucide-list-ordered', label: 'Ordered List' }
      ]
    },
    { kind: 'blockquote', icon: 'i-lucide-text-quote', tooltip: { text: 'Quote' } },
    { kind: 'codeBlock', icon: 'i-lucide-square-code', tooltip: { text: 'Code' } },
    { kind: 'horizontalRule', icon: 'i-lucide-separator-horizontal', tooltip: { text: 'Divider' } }
  ],
  // Text formatting
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Bold' } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italic' } },
    { kind: 'mark', mark: 'underline', icon: 'i-lucide-underline', tooltip: { text: 'Underline' } },
    { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough', tooltip: { text: 'Strike' } },
    { kind: 'mark', mark: 'code', icon: 'i-lucide-code', tooltip: { text: 'Code' } }
  ],
  // Link
  [
    { kind: 'link', icon: 'i-lucide-link', tooltip: { text: 'Link' } }
  ]
]

// Computed toolbar items with optional AI translation button
const toolbarItems = computed<EditorToolbarItem[][]>(() => {
  const items = [...baseToolbarItems]

  // Add AI translation button when enabled and context is provided
  if (props.enableTranslationAI && props.translationContext) {
    items.push([
      {
        icon: 'i-lucide-sparkles',
        tooltip: { text: 'Translate selection (⌘J)' },
        onClick: triggerTranslation
      } as EditorToolbarItem
    ])
  }

  return items
})

// Bubble toolbar items (appears on text selection)
const bubbleToolbarItems: EditorToolbarItem[][] = [
  // Turn into dropdown
  [
    {
      label: 'Turn into',
      trailingIcon: 'i-lucide-chevron-down',
      activeColor: 'neutral',
      activeVariant: 'ghost',
      content: { align: 'start' },
      ui: { label: 'text-xs' },
      items: [
        { type: 'label', label: 'Turn into' },
        { kind: 'paragraph', label: 'Paragraph', icon: 'i-lucide-type' },
        { kind: 'heading', level: 1, label: 'Heading 1', icon: 'i-lucide-heading-1' },
        { kind: 'heading', level: 2, label: 'Heading 2', icon: 'i-lucide-heading-2' },
        { kind: 'heading', level: 3, label: 'Heading 3', icon: 'i-lucide-heading-3' },
        { kind: 'bulletList', label: 'Bullet List', icon: 'i-lucide-list' },
        { kind: 'orderedList', label: 'Ordered List', icon: 'i-lucide-list-ordered' },
        { kind: 'blockquote', label: 'Quote', icon: 'i-lucide-text-quote' },
        { kind: 'codeBlock', label: 'Code', icon: 'i-lucide-square-code' }
      ]
    }
  ],
  // Text formatting
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Bold' } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italic' } },
    { kind: 'mark', mark: 'underline', icon: 'i-lucide-underline', tooltip: { text: 'Underline' } },
    { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough', tooltip: { text: 'Strike' } },
    { kind: 'mark', mark: 'code', icon: 'i-lucide-code', tooltip: { text: 'Code' } }
  ],
  // Link
  [
    { kind: 'link', icon: 'i-lucide-link', tooltip: { text: 'Link' } }
  ]
]
</script>

<template>
  <UEditor
    v-slot="{ editor }"
    v-model="model"
    :content-type="contentType"
    :placeholder="placeholder"
    :editable="editable"
    :autofocus="autofocus"
    :extensions="allExtensions"
    class="flex flex-col h-full"
    :ui="{
      root: 'h-full flex flex-col',
      content: 'flex-1 overflow-auto prose prose-sm dark:prose-invert max-w-none p-4'
    }"
    @create="handleEditorCreate"
    @update="$emit('update', $event)"
  >
    <!-- Fixed toolbar at top -->
    <UEditorToolbar
      v-if="editor && showToolbar"
      :editor="editor"
      :items="toolbarItems"
      class="border-b border-default px-2 py-1.5 flex-shrink-0"
    >
      <!-- Loading indicator when translating -->
      <template v-if="isTranslating" #append>
        <div class="flex items-center gap-2 text-xs text-gray-500 ml-2">
          <UIcon name="i-lucide-loader-2" class="animate-spin" />
          <span>Translating...</span>
        </div>
      </template>
    </UEditorToolbar>

    <!-- Bubble toolbar on text selection -->
    <UEditorToolbar
      v-if="editor && showBubbleToolbar"
      :editor="editor"
      :items="bubbleToolbarItems"
      layout="bubble"
      :should-show="({ view, state }: any) => {
        const { selection } = state
        return view.hasFocus() && !selection.empty
      }"
    />
  </UEditor>
</template>
