<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { useToggle } from '@vueuse/core'
import { useNotify } from '#imports'

/**
 * AI Translate Button
 *
 * Smart translate button: handles the API call internally and emits the
 * resulting text. Optionally shows a confirmation modal when the target
 * already has content, and a context-language selector popup.
 *
 * For block-editor or other parent-controlled translation flows, use a
 * plain trigger button (e.g. `<CroutonI18nBlockTranslateTrigger />`) and
 * handle translation in the parent.
 *
 * @example
 * <AITranslateButton
 *   :source-text="englishText"
 *   source-language="en"
 *   target-language="nl"
 *   :target-has-content="!!targetText"
 *   :available-translations="{ en: 'Hello', fr: 'Bonjour' }"
 *   @translate="(text) => myValue = text"
 * />
 */

const props = defineProps<{
  /** The text to translate */
  sourceText?: string
  /** Source language code (e.g., 'en') */
  sourceLanguage?: string
  /** Target language code (e.g., 'nl') */
  targetLanguage?: string
  /** Optional field type for context */
  fieldType?: string
  /** Existing translations for consistency */
  existingTranslations?: Record<string, string>
  /** Whether the target field already has content (triggers confirmation) */
  targetHasContent?: boolean
  /** All available translations for context selection UI */
  availableTranslations?: Record<string, string>
  /** Button label override */
  label?: string
  /** Button size */
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Show only icon (no label) */
  iconOnly?: boolean
}>()

const emit = defineEmits<{
  /** Emitted when translation completes */
  translate: [text: string]
  /** Emitted when translation fails */
  error: [error: Error]
}>()

const notify = useNotify()

const internalLoading = ref(false)

const [showConfirmModal, toggleConfirmModal] = useToggle(false)
const [showContextSelector, toggleContextSelector] = useToggle(false)
const selectedContextLocales = reactive(new Set<string>())

// Initialize selected locales when availableTranslations changes
watch(() => props.availableTranslations, (translations) => {
  if (translations) {
    selectedContextLocales.clear()
    Object.keys(translations)
      .filter(locale => locale !== props.targetLanguage)
      .forEach(locale => selectedContextLocales.add(locale))
  }
}, { immediate: true })

watch(() => props.targetLanguage, () => {
  if (props.availableTranslations) {
    selectedContextLocales.clear()
    Object.keys(props.availableTranslations)
      .filter(locale => locale !== props.targetLanguage)
      .forEach(locale => selectedContextLocales.add(locale))
  }
})

const contextLocales = computed(() => {
  if (!props.availableTranslations) return []
  return Object.entries(props.availableTranslations)
    .filter(([locale]) => locale !== props.targetLanguage)
    .map(([locale, text]) => ({
      locale,
      text: typeof text === 'string' ? text.substring(0, 50) + (text.length > 50 ? '...' : '') : ''
    }))
})

const allContextsSelected = computed(() => {
  return contextLocales.value.length > 0 &&
    selectedContextLocales.size === contextLocales.value.length
})

function toggleContextLocale(locale: string) {
  if (selectedContextLocales.has(locale)) {
    selectedContextLocales.delete(locale)
  } else {
    selectedContextLocales.add(locale)
  }
}

function getFilteredTranslations(): Record<string, string> {
  if (!props.existingTranslations) return {}
  const filtered: Record<string, string> = {}
  for (const [locale, text] of Object.entries(props.existingTranslations)) {
    if (selectedContextLocales.has(locale)) {
      filtered[locale] = text
    }
  }
  return filtered
}

const hasSourceContent = computed(() => {
  return !!(props.sourceText && props.sourceText.trim().length > 0)
})

const canTranslate = computed(() => {
  return hasSourceContent.value && props.sourceLanguage !== props.targetLanguage
})

const tooltipText = computed(() => {
  if (!hasSourceContent.value) {
    return `No ${props.sourceLanguage?.toUpperCase() || ''} content to translate`
  }
  if (props.sourceLanguage === props.targetLanguage) {
    return 'Source and target language are the same'
  }
  return `Translate from ${props.sourceLanguage?.toUpperCase()} to ${props.targetLanguage?.toUpperCase()}`
})

const buttonLabel = computed(() => {
  if (props.iconOnly) return ''
  return props.label || 'Translate'
})

async function handleClick() {
  if (!canTranslate.value || internalLoading.value) return

  if (props.targetHasContent) {
    showConfirmModal.value = true
    return
  }

  await doTranslation()
}

async function proceedWithTranslation() {
  showConfirmModal.value = false
  await doTranslation()
}

function cancelConfirmation() {
  showConfirmModal.value = false
}

async function doTranslation() {
  if (!props.sourceText || !props.sourceLanguage || !props.targetLanguage) return

  internalLoading.value = true

  try {
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
      notify.warning('AI Translation Not Configured', {
        description: 'Set NUXT_ANTHROPIC_API_KEY or NUXT_OPENAI_API_KEY in your .env file',
        icon: 'i-lucide-key'
      })
    } else {
      notify.error('Translation Failed', {
        description: errorMessage,
        icon: 'i-lucide-alert-circle'
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
        :size="(size || 'xs') as any"
        variant="ghost"
        color="neutral"
        class="opacity-40 hover:opacity-100 transition-opacity"
        :loading="internalLoading"
        :disabled="!canTranslate"
        @click="handleClick"
      >
        <template v-if="buttonLabel">{{ buttonLabel }}</template>
      </UButton>
    </UTooltip>

    <!-- Context selector button -->
    <UPopover
      v-if="contextLocales.length > 0"
      v-model:open="showContextSelector"
    >
      <UTooltip text="Select context languages">
        <UButton
          icon="i-lucide-settings-2"
          :size="(size || 'xs') as any"
          variant="ghost"
          color="neutral"
          :disabled="!canTranslate"
          class="relative opacity-40 hover:opacity-100 transition-opacity"
        >
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
