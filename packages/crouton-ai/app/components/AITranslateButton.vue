<script setup lang="ts">
import { ref, computed } from 'vue'
import { useToast } from '#imports'

/**
 * AI Translate Button
 *
 * A button that triggers AI translation. Can be used in two modes:
 *
 * 1. **Simple mode** (with sourceText): Handles translation internally
 * 2. **Controlled mode** (without sourceText): Just emits click, parent handles translation
 *
 * @example Simple mode - component handles translation
 * <AITranslateButton
 *   :source-text="englishText"
 *   source-language="en"
 *   target-language="nl"
 *   @translate="(text) => myValue = text"
 * />
 *
 * @example Controlled mode - parent handles translation
 * <AITranslateButton
 *   :loading="isTranslating"
 *   :disabled="!hasContent"
 *   tooltip="Translate from EN"
 *   @click="handleTranslate"
 * />
 */

const props = defineProps<{
  // === Simple mode props (component handles translation) ===
  /** The text to translate (enables simple mode) */
  sourceText?: string
  /** Source language code (e.g., 'en') */
  sourceLanguage?: string
  /** Target language code (e.g., 'nl') */
  targetLanguage?: string
  /** Optional field type for context */
  fieldType?: string
  /** Existing translations for consistency */
  existingTranslations?: Record<string, string>

  // === Controlled mode props (parent handles translation) ===
  /** Loading state (controlled mode) */
  loading?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Custom tooltip text */
  tooltip?: string

  // === Shared props ===
  /** Button label override */
  label?: string
  /** Button size */
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Whether this is for block editor content */
  isBlockEditor?: boolean
  /** Show only icon (no label) */
  iconOnly?: boolean
}>()

const emit = defineEmits<{
  /** Emitted on click (controlled mode) or when translation completes (simple mode) */
  translate: [text: string]
  /** Emitted on button click */
  click: []
  /** Emitted when translation fails (simple mode only) */
  error: [error: Error]
}>()

const toast = useToast()

// Internal loading state for simple mode
const internalLoading = ref(false)

// Determine if we're in simple mode (component handles translation)
const isSimpleMode = computed(() => !!props.sourceText)

// Combined loading state
const isLoading = computed(() => props.loading || internalLoading.value)

// Check if there's content to translate (simple mode)
const hasSourceContent = computed(() => {
  if (!isSimpleMode.value) return true // In controlled mode, parent decides
  return props.sourceText && props.sourceText.trim().length > 0
})

// Don't translate to same language
const canTranslate = computed(() => {
  if (props.disabled) return false
  if (!isSimpleMode.value) return !props.disabled
  return hasSourceContent.value && props.sourceLanguage !== props.targetLanguage
})

// Tooltip text
const tooltipText = computed(() => {
  if (props.tooltip) return props.tooltip
  if (!isSimpleMode.value) return 'Translate with AI'
  if (!hasSourceContent.value) {
    return `No ${props.sourceLanguage?.toUpperCase() || ''} content to translate`
  }
  if (props.sourceLanguage === props.targetLanguage) {
    return 'Source and target language are the same'
  }
  return `Translate from ${props.sourceLanguage?.toUpperCase()} to ${props.targetLanguage?.toUpperCase()}`
})

// Button label
const buttonLabel = computed(() => {
  if (props.iconOnly) return ''
  if (props.label) return props.label
  return props.isBlockEditor ? 'Translate blocks' : 'Translate'
})

async function handleClick() {
  if (!canTranslate.value || isLoading.value) return

  // Always emit click for controlled mode consumers
  emit('click')

  // If in simple mode, also do the translation
  if (isSimpleMode.value) {
    await doTranslation()
  }
}

async function doTranslation() {
  if (!props.sourceText || !props.sourceLanguage || !props.targetLanguage) return

  internalLoading.value = true

  try {
    const response = await $fetch<{ text: string; confidence: number }>('/api/ai/translate', {
      method: 'POST',
      body: {
        sourceText: props.sourceText,
        sourceLanguage: props.sourceLanguage,
        targetLanguage: props.targetLanguage,
        fieldType: props.fieldType,
        existingTranslations: props.existingTranslations
      }
    })

    if (response?.text) {
      emit('translate', response.text)
    }
  } catch (err: any) {
    console.error('Translation error:', err)

    const errorMessage = err?.data?.statusMessage || err?.message || 'Translation failed'

    if (errorMessage.includes('API key not configured') || errorMessage.includes('No AI API key')) {
      toast.add({
        title: 'AI Translation Not Configured',
        description: 'Set NUXT_ANTHROPIC_API_KEY or NUXT_OPENAI_API_KEY in your .env file',
        icon: 'i-lucide-key',
        color: 'warning'
      })
    } else {
      toast.add({
        title: 'Translation Failed',
        description: errorMessage,
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })
    }

    emit('error', err)
  } finally {
    internalLoading.value = false
  }
}
</script>

<template>
  <UTooltip :text="tooltipText">
    <UButton
      icon="i-lucide-sparkles"
      :size="size || 'xs'"
      variant="ghost"
      color="neutral"
      :loading="isLoading"
      :disabled="!canTranslate"
      @click="handleClick"
    >
      <template v-if="buttonLabel">{{ buttonLabel }}</template>
    </UButton>
  </UTooltip>
</template>