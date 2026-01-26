<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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
 *
 * @example With confirmation when target has content
 * <AITranslateButton
 *   :source-text="englishText"
 *   :target-has-content="!!targetText"
 *   @translate="(text) => myValue = text"
 * />
 *
 * @example With context language selector
 * <AITranslateButton
 *   :source-text="englishText"
 *   :available-translations="{ en: 'Hello', fr: 'Bonjour', de: 'Hallo' }"
 *   @translate="(text) => myValue = text"
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

  // === Confirmation props ===
  /** Whether the target field already has content (triggers confirmation) */
  targetHasContent?: boolean

  // === Context selector props ===
  /** All available translations for context selection UI */
  availableTranslations?: Record<string, string>

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

// Confirmation modal state
const showConfirmModal = ref(false)

// Context selector state
const showContextSelector = ref(false)
const selectedContextLocales = ref<Set<string>>(new Set())

// Initialize selected locales when availableTranslations changes
watch(() => props.availableTranslations, (translations) => {
  if (translations) {
    // Select all locales by default (except target)
    selectedContextLocales.value = new Set(
      Object.keys(translations).filter(locale => locale !== props.targetLanguage)
    )
  }
}, { immediate: true })

// Also update when target language changes
watch(() => props.targetLanguage, () => {
  if (props.availableTranslations) {
    selectedContextLocales.value = new Set(
      Object.keys(props.availableTranslations).filter(locale => locale !== props.targetLanguage)
    )
  }
})

// Computed: available context locales (all except target)
const contextLocales = computed(() => {
  if (!props.availableTranslations) return []
  return Object.entries(props.availableTranslations)
    .filter(([locale]) => locale !== props.targetLanguage)
    .map(([locale, text]) => ({
      locale,
      text: typeof text === 'string' ? text.substring(0, 50) + (text.length > 50 ? '...' : '') : ''
    }))
})

// Check if all contexts are selected
const allContextsSelected = computed(() => {
  return contextLocales.value.length > 0 &&
    selectedContextLocales.value.size === contextLocales.value.length
})

// Toggle a locale in the context selection
function toggleContextLocale(locale: string) {
  if (selectedContextLocales.value.has(locale)) {
    selectedContextLocales.value.delete(locale)
  } else {
    selectedContextLocales.value.add(locale)
  }
  // Force reactivity
  selectedContextLocales.value = new Set(selectedContextLocales.value)
}

// Get filtered translations based on selection
function getFilteredTranslations(): Record<string, string> {
  if (!props.existingTranslations) return {}
  const filtered: Record<string, string> = {}
  for (const [locale, text] of Object.entries(props.existingTranslations)) {
    if (selectedContextLocales.value.has(locale)) {
      filtered[locale] = text
    }
  }
  return filtered
}

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

  // Check if we need confirmation (target has content)
  if (props.targetHasContent && isSimpleMode.value) {
    showConfirmModal.value = true
    return
  }

  // Proceed with translation
  await proceedWithTranslation()
}

// Called after confirmation or when no confirmation needed
async function proceedWithTranslation() {
  showConfirmModal.value = false

  // Always emit click for controlled mode consumers
  emit('click')

  // If in simple mode, also do the translation
  if (isSimpleMode.value) {
    await doTranslation()
  }
}

// Cancel confirmation
function cancelConfirmation() {
  showConfirmModal.value = false
}

async function doTranslation() {
  if (!props.sourceText || !props.sourceLanguage || !props.targetLanguage) return

  internalLoading.value = true

  try {
    // Use filtered translations based on context selection
    const translations = props.availableTranslations
      ? getFilteredTranslations()
      : props.existingTranslations

    const response = await $fetch<{ text: string; confidence: number }>('/api/ai/translate', {
      method: 'POST',
      body: {
        sourceText: props.sourceText,
        sourceLanguage: props.sourceLanguage,
        targetLanguage: props.targetLanguage,
        fieldType: props.fieldType,
        existingTranslations: translations
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
  <div class="inline-flex items-center gap-0.5">
    <!-- Main translate button -->
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

    <!-- Context selector button (only in simple mode with available translations) -->
    <UPopover
      v-if="isSimpleMode && contextLocales.length > 0"
      v-model:open="showContextSelector"
    >
      <UTooltip text="Select context languages">
        <UButton
          icon="i-lucide-settings-2"
          :size="size || 'xs'"
          variant="ghost"
          color="neutral"
          :disabled="!canTranslate"
          class="relative"
        >
          <!-- Indicator when not all contexts selected -->
          <span
            v-if="!allContextsSelected && selectedContextLocales.size > 0"
            class="absolute -top-0.5 -right-0.5 size-2 bg-primary rounded-full"
          />
        </UButton>
      </UTooltip>

      <template #content>
        <div class="p-3 min-w-[200px]">
          <p class="text-xs font-medium text-muted mb-2">Include as context:</p>
          <div class="space-y-1.5">
            <label
              v-for="ctx in contextLocales"
              :key="ctx.locale"
              class="flex items-start gap-2 cursor-pointer hover:bg-elevated rounded p-1 -mx-1"
            >
              <UCheckbox
                :model-value="selectedContextLocales.has(ctx.locale)"
                @update:model-value="toggleContextLocale(ctx.locale)"
              />
              <span class="flex-1 min-w-0">
                <span class="text-sm font-medium">{{ ctx.locale.toUpperCase() }}</span>
                <span v-if="ctx.text" class="block text-xs text-muted truncate">
                  {{ ctx.text }}
                </span>
              </span>
            </label>
          </div>
          <p v-if="selectedContextLocales.size === 0" class="text-xs text-primary mt-2">
            No context selected - AI will translate without reference
          </p>
        </div>
      </template>
    </UPopover>

    <!-- Confirmation modal -->
    <UModal v-model:open="showConfirmModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 size-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UIcon name="i-lucide-alert-triangle" class="size-5 text-primary" />
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold">Replace existing translation?</h3>
              <p class="text-sm text-muted mt-1">
                The target field already has content. Translating will replace it with a new AI-generated translation.
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-6">
            <UButton
              color="neutral"
              variant="ghost"
              @click="cancelConfirmation"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              @click="proceedWithTranslation"
            >
              Replace
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>