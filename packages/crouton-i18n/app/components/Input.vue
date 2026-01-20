<script setup lang="ts">
// This component handles translations for both:
// 1. Single field: { en: "value", nl: "waarde" }
// 2. Multiple fields: { en: { name: "...", description: "..." }, nl: { ... } }

type SingleFieldValue = Record<string, string>
type MultiFieldValue = Record<string, Record<string, string>>
type TranslationsValue = SingleFieldValue | MultiFieldValue | null

/**
 * Optional collab connection for real-time editing.
 * When provided, block editors sync via Yjs instead of form state.
 */
interface CollabConnection {
  /** Get Y.XmlFragment for a specific locale */
  getXmlFragment: (locale: string) => any
  /** Get collab provider for cursor awareness */
  connection?: { awareness?: any }
  /** Current user info */
  user?: { name: string; color?: string }
}

const props = defineProps<{
  modelValue: TranslationsValue
  fields: string[] // Fields to translate e.g., ['name', 'description']
  label?: string
  error?: string | boolean
  defaultValues?: Record<string, string> // Default values for each field (from main form fields)
  fieldComponents?: Record<string, string> // Custom components per field e.g., { content: 'EditorSimple' }
  showAiTranslate?: boolean // Enable AI translation suggestions
  fieldType?: string // Field type context for AI (e.g., 'product_name', 'description')
  /**
   * Collab connection for real-time block editing.
   * When provided with block editor fields, content syncs via Yjs.
   */
  collab?: CollabConnection
  /**
   * Layout mode: "tabs" (default) or "side-by-side".
   * Side-by-side shows two locale columns for easy comparison.
   */
  layout?: 'tabs' | 'side-by-side'
  /**
   * Primary locale for side-by-side layout (left column, fixed).
   * Default: 'en'
   */
  primaryLocale?: string
  /**
   * Secondary locale for side-by-side layout (right column).
   * If not set, shows a dropdown to select.
   */
  secondaryLocale?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TranslationsValue]
  'update:english': [data: { field: string, value: string }]
}>()

// Get the component name to use for a specific field (returns string for template resolution)
const getFieldComponent = (field: string) => {
  return props.fieldComponents?.[field] || 'UInput'
}

// Create a map of field to resolved component for each field (using resolveComponent in render context)
const fieldComponentMap = computed(() => {
  const map: Record<string, any> = {}
  props.fields?.forEach((field) => {
    const componentName = getFieldComponent(field)
    map[field] = componentName
  })
  return map
})

const { locale, locales } = useI18n()
const toast = useToast()

// Track which locale we're editing (for tabs mode)
const editingLocale = ref(locale.value)

// Layout mode (defaults to tabs for backwards compatibility)
const layoutMode = computed(() => props.layout ?? 'tabs')

// For side-by-side mode: track both locales (both selectable)
const allLocaleCodes = computed(() =>
  locales.value.map(l => typeof l === 'string' ? l : l.code)
)

// Left column locale (defaults to 'en' or first available)
const primaryEditingLocale = ref(
  props.primaryLocale ||
  (allLocaleCodes.value.includes('en') ? 'en' : allLocaleCodes.value[0]) ||
  'en'
)

// Right column locale (defaults to second available locale)
const secondaryEditingLocale = ref(
  props.secondaryLocale ||
  allLocaleCodes.value.find(code => code !== primaryEditingLocale.value) ||
  'nl'
)

// Locale options for left dropdown (excludes right's selection)
const leftLocaleOptions = computed(() =>
  allLocaleCodes.value
    .filter(code => code !== secondaryEditingLocale.value)
    .map(code => ({ value: code, label: code.toUpperCase() }))
)

// Locale options for right dropdown (excludes left's selection)
const rightLocaleOptions = computed(() =>
  allLocaleCodes.value
    .filter(code => code !== primaryEditingLocale.value)
    .map(code => ({ value: code, label: code.toUpperCase() }))
)

// For narrow screens: tab-based locale switching (shows ALL locales)
const narrowLocaleTab = ref(primaryEditingLocale.value)

// Tab items for narrow view - show ALL available locales
const narrowLocaleTabs = computed(() =>
  allLocaleCodes.value.map(code => ({
    value: code,
    label: code.toUpperCase()
  }))
)

// Sync narrow tab when primary locale changes
watch(primaryEditingLocale, (primary) => {
  // Only reset if current tab no longer exists in available locales
  if (!allLocaleCodes.value.includes(narrowLocaleTab.value)) {
    narrowLocaleTab.value = primary
  }
})

// Detect if we're in multi-field mode
const isMultiField = computed(() => props.fields && props.fields.length > 0)

// Get value for a specific field and locale
function getFieldValue(field: string, localeCode: string): string {
  if (!props.modelValue) return ''

  if (isMultiField.value) {
    // Multi-field mode: { en: { name: "...", description: "..." } }
    const localeData = props.modelValue[localeCode] as Record<string, string> | undefined
    return localeData?.[field] || ''
  } else {
    // Single field mode: { en: "value", nl: "waarde" }
    return (props.modelValue[localeCode] as string) || ''
  }
}

// Update a specific field for a specific locale
function updateFieldValue(field: string, value: string, localeCode?: string) {
  const targetLocale = localeCode || editingLocale.value

  // Emit update:english when English value changes
  if (targetLocale === 'en') {
    emit('update:english', { field, value })
  }

  if (isMultiField.value) {
    // Multi-field mode
    const updated = { ...(props.modelValue || {}) } as MultiFieldValue

    if (!updated[targetLocale]) {
      updated[targetLocale] = {}
    }

    updated[targetLocale] = {
      ...updated[targetLocale],
      [field]: value
    }

    emit('update:modelValue', updated)
  } else {
    // Single field mode (backwards compat)
    const updated = {
      ...(props.modelValue || {}),
      [targetLocale]: value
    } as SingleFieldValue

    emit('update:modelValue', updated)
  }
}

// Check if a locale has all required fields filled
function isLocaleComplete(localeCode: string): boolean {
  if (!props.modelValue) return false

  if (isMultiField.value) {
    const localeData = props.modelValue[localeCode] as Record<string, unknown> | undefined
    if (!localeData) return false

    // Check if all fields have values
    return props.fields.every((field) => {
      const value = localeData[field]
      if (!value) return false
      // Handle string values (title, slug, etc.)
      if (typeof value === 'string') return value.trim() !== ''
      // Handle object values (block editor JSON content)
      if (typeof value === 'object') return true
      return !!value
    })
  } else {
    const value = props.modelValue[localeCode]
    if (!value) return false
    if (typeof value === 'string') return value.trim() !== ''
    return !!value
  }
}

// Translation status for all locales
const translationStatus = computed(() => {
  return locales.value.map((loc) => {
    const localeCode = typeof loc === 'string' ? loc : loc.code
    return {
      locale: localeCode,
      complete: isLocaleComplete(localeCode)
    }
  })
})

// AI Translation support
const isTranslating = ref<Record<string, boolean>>({})

// Get all translations for a field (for AI context)
function getAllTranslationsForField(field: string): Record<string, string> {
  const translations: Record<string, string> = {}

  locales.value.forEach((loc) => {
    const localeCode = typeof loc === 'string' ? loc : loc.code
    const value = getFieldValue(field, localeCode)
    if (value) {
      translations[localeCode] = value
    }
  })

  return translations
}

// Request AI translation for a specific field (translates from left column to right column)
// Check if a value has meaningful content (handles strings and JSON)
function hasContent(value: unknown): boolean {
  if (!value) return false
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed) return false
  // Check if it's block editor JSON with no content
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      return parsed?.content?.length > 0
    } catch {
      return true // Not JSON, treat as text
    }
  }
  return true
}

// Find the best source locale for translation (prefers EN, then any with content)
function findBestSourceLocale(field: string, targetLocale: string): string | null {
  const allTranslations = getAllTranslationsForField(field)

  // Remove target locale from candidates and filter to those with content
  const candidates = Object.entries(allTranslations)
    .filter(([locale, value]) => locale !== targetLocale && hasContent(value))

  if (candidates.length === 0) return null

  // Prefer English if available
  const english = candidates.find(([locale]) => locale === 'en')
  if (english) return 'en'

  // Otherwise return first available
  return candidates[0][0]
}

async function requestTranslation(field: string, targetLocale?: string) {
  const targetLang = targetLocale || editingLocale.value
  const allTranslations = getAllTranslationsForField(field)

  // Find best source locale
  const sourceLang = findBestSourceLocale(field, targetLang)
  if (!sourceLang) return

  const sourceText = allTranslations[sourceLang]
  if (!sourceText || targetLang === sourceLang) return

  const translationKey = `${targetLang}-${field}`
  isTranslating.value[translationKey] = true

  try {
    // Check if this is block content (JSON)
    if (isBlockEditorField(field)) {
      // Parse and translate block content
      let content: any
      try {
        content = typeof sourceText === 'string' ? JSON.parse(sourceText) : sourceText
      } catch {
        console.error('Failed to parse block content')
        return
      }

      const result = await $fetch<{ content: any, translatedCount?: number }>('/api/ai/translate-blocks', {
        method: 'POST',
        body: {
          content,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang
        }
      })

      if (result?.content) {
        updateFieldValue(field, JSON.stringify(result.content), targetLang)
      }
    } else {
      // Regular text translation
      const result = await $fetch<{ text: string, confidence?: number }>('/api/ai/translate', {
        method: 'POST',
        body: {
          sourceText,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          fieldType: props.fieldType || field,
          existingTranslations: allTranslations
        }
      })

      if (result?.text) {
        updateFieldValue(field, result.text, targetLang)
      }
    }
  } catch (err: any) {
    console.error('Translation error:', err)

    // Show user-friendly toast for common errors
    const errorMessage = err?.data?.statusMessage || err?.message || 'Translation failed'

    if (errorMessage.includes('API key not configured')) {
      toast.add({
        title: 'AI Translation Not Configured',
        description: 'Set NUXT_OPENAI_API_KEY or NUXT_ANTHROPIC_API_KEY in your .env file',
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
  } finally {
    isTranslating.value[translationKey] = false
  }
}

// Check if currently translating a specific field
function isFieldTranslating(field: string, targetLocale?: string): boolean {
  const targetLang = targetLocale || editingLocale.value
  const translationKey = `${targetLang}-${field}`
  return isTranslating.value[translationKey] || false
}

// Check if a field uses a block editor (content is JSON, not plain text)
function isBlockEditorField(field: string): boolean {
  const component = getFieldComponent(field)
  return component === 'CroutonPagesEditorBlockEditor' ||
         component === 'CroutonPagesEditorBlockEditorWithPreview'
}

// Check if ANY other locale has content for a field (to enable translation)
function hasSourceContent(field: string, targetLocale?: string): boolean {
  const target = targetLocale || editingLocale.value
  const sourceLang = findBestSourceLocale(field, target)
  return sourceLang !== null
}

// Get tooltip text showing which language will be used as source
function getTranslateTooltip(field: string, targetLocale: string): string {
  const sourceLang = findBestSourceLocale(field, targetLocale)
  if (!sourceLang) return 'Translate'
  return `Translate from ${sourceLang.toUpperCase()}`
}

// Get the best source text for translation (used by AITranslateButton)
function getBestSourceText(field: string, targetLocale: string): string | undefined {
  const sourceLang = findBestSourceLocale(field, targetLocale)
  if (!sourceLang) return undefined
  const allTranslations = getAllTranslationsForField(field)
  return allTranslations[sourceLang]
}

// Request block editor translation (controlled mode - parent handles the API call)
async function requestBlockTranslation(field: string, targetLocale: string) {
  const sourceLang = findBestSourceLocale(field, targetLocale)
  if (!sourceLang) return

  const allTranslations = getAllTranslationsForField(field)
  const sourceText = allTranslations[sourceLang]
  if (!sourceText) return

  const translationKey = `${targetLocale}-${field}`
  isTranslating.value[translationKey] = true

  try {
    // Parse and translate block content
    let content: any
    try {
      content = typeof sourceText === 'string' ? JSON.parse(sourceText) : sourceText
    } catch {
      console.error('Failed to parse block content')
      return
    }

    const result = await $fetch<{ content: any, translatedCount?: number }>('/api/ai/translate-blocks', {
      method: 'POST',
      body: {
        content,
        sourceLanguage: sourceLang,
        targetLanguage: targetLocale
      }
    })

    if (result?.content) {
      updateFieldValue(field, JSON.stringify(result.content), targetLocale)
    }
  } catch (err: any) {
    console.error('Block translation error:', err)

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
  } finally {
    isTranslating.value[translationKey] = false
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- ============================================= -->
    <!-- SIDE-BY-SIDE LAYOUT (with tabs on narrow)    -->
    <!-- ============================================= -->
    <template v-if="layoutMode === 'side-by-side' && isMultiField">
      <!-- NARROW: Tab-based locale switching (< lg screens) -->
      <div class="lg:hidden flex flex-col h-full min-h-0">
        <!-- Locale tabs -->
        <UTabs
          v-model="narrowLocaleTab"
          :items="narrowLocaleTabs"
          :content="false"
          class="mb-3"
        />

        <!-- Fields for active locale -->
        <div class="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto">
          <div
            v-for="field in fields"
            :key="`narrow-${field}`"
            :class="[
              'flex flex-col gap-1',
              field === 'content' ? 'flex-1 min-h-[300px]' : ''
            ]"
          >
            <div class="flex items-center justify-between h-5">
              <label class="text-xs font-medium text-muted uppercase tracking-wide">
                {{ field }}
              </label>
              <!-- AI Translate button - uses stub (renders nothing) if crouton-ai not extended -->
              <AITranslateButton
                v-if="showAiTranslate && !isBlockEditorField(field)"
                :source-text="getBestSourceText(field, narrowLocaleTab)"
                :source-language="findBestSourceLocale(field, narrowLocaleTab)"
                :target-language="narrowLocaleTab"
                :field-type="fieldType || field"
                :existing-translations="getAllTranslationsForField(field)"
                size="2xs"
                icon-only
                @translate="(text) => updateFieldValue(field, text, narrowLocaleTab)"
              />
              <!-- Block editor translation (controlled mode) -->
              <AITranslateButton
                v-if="showAiTranslate && isBlockEditorField(field)"
                :loading="isFieldTranslating(field, narrowLocaleTab)"
                :disabled="!hasSourceContent(field, narrowLocaleTab)"
                :tooltip="getTranslateTooltip(field, narrowLocaleTab)"
                size="2xs"
                icon-only
                is-block-editor
                @click="requestBlockTranslation(field, narrowLocaleTab)"
              />
            </div>

            <!-- CroutonEditorSimple -->
            <div
              v-if="getFieldComponent(field) === 'CroutonEditorSimple'"
              class="flex-1 border rounded-md overflow-hidden border-default"
            >
              <div class="h-full min-h-[200px]">
                <CroutonEditorSimple
                  :model-value="getFieldValue(field, narrowLocaleTab)"
                  @update:model-value="updateFieldValue(field, $event, narrowLocaleTab)"
                />
              </div>
            </div>

            <!-- CroutonPagesEditorBlockEditor -->
            <div
              v-else-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditor'"
              class="flex-1 border rounded-md overflow-hidden border-default"
            >
              <div class="h-full min-h-[350px]">
                <CroutonPagesEditorBlockEditor
                  :model-value="collab ? undefined : getFieldValue(field, narrowLocaleTab)"
                  :yxml-fragment="collab?.getXmlFragment(narrowLocaleTab)"
                  :collab-provider="collab?.connection"
                  :collab-user="collab?.user"
                  :editable="true"
                  placeholder="Type / to insert a block..."
                  @update:model-value="!collab && updateFieldValue(field, $event, narrowLocaleTab)"
                />
              </div>
            </div>

            <!-- CroutonPagesEditorBlockEditorWithPreview -->
            <div
              v-else-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditorWithPreview'"
              class="flex-1 min-h-[350px] max-h-[600px]"
            >
              <CroutonPagesEditorBlockEditorWithPreview
                :model-value="collab ? undefined : getFieldValue(field, narrowLocaleTab)"
                :yxml-fragment="collab?.getXmlFragment(narrowLocaleTab)"
                :collab-provider="collab?.connection"
                :collab-user="collab?.user"
                :editable="true"
                placeholder="Type / to insert a block..."
                @update:model-value="!collab && updateFieldValue(field, $event, narrowLocaleTab)"
              />
            </div>

            <!-- UTextarea -->
            <UTextarea
              v-else-if="getFieldComponent(field) === 'UTextarea'"
              :model-value="getFieldValue(field, narrowLocaleTab)"
              :placeholder="narrowLocaleTab !== primaryEditingLocale && getFieldValue(field, primaryEditingLocale) ? `${primaryEditingLocale.toUpperCase()}: ${getFieldValue(field, primaryEditingLocale)}` : (defaultValues?.[field] || '')"
              :color="error && !getFieldValue(field, narrowLocaleTab) ? 'error' : 'primary'"
              :highlight="!!(error && !getFieldValue(field, narrowLocaleTab))"
              class="w-full"
              size="sm"
              @update:model-value="updateFieldValue(field, $event, narrowLocaleTab)"
            />

            <!-- UInput (default) -->
            <UInput
              v-else
              :model-value="getFieldValue(field, narrowLocaleTab)"
              :placeholder="narrowLocaleTab !== primaryEditingLocale && getFieldValue(field, primaryEditingLocale) ? `${primaryEditingLocale.toUpperCase()}: ${getFieldValue(field, primaryEditingLocale)}` : (defaultValues?.[field] || '')"
              :color="error && !getFieldValue(field, narrowLocaleTab) ? 'error' : 'primary'"
              :highlight="!!(error && !getFieldValue(field, narrowLocaleTab))"
              class="w-full"
              size="sm"
              @update:model-value="updateFieldValue(field, $event, narrowLocaleTab)"
            />
          </div>
        </div>
      </div>

      <!-- WIDE: Side-by-side columns (lg+ screens) -->
      <div class="hidden lg:grid grid-cols-2 gap-6 h-full min-h-0">
        <!-- LEFT COLUMN: Primary locale (selectable) -->
        <div class="flex flex-col min-h-0">
          <!-- Column header with dropdown -->
          <div class="flex items-center gap-2 h-7 mb-3 border-b border-default">
            <USelect
              v-model="primaryEditingLocale"
              :items="leftLocaleOptions"
              value-key="value"
              size="xs"
              class="flex-1"
            />
            <UIcon
              v-if="isLocaleComplete(primaryEditingLocale)"
              name="i-lucide-check-circle"
              class="text-green-500 size-3.5"
            />
          </div>

          <!-- Primary locale fields -->
          <div class="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto">
            <div
              v-for="field in fields"
              :key="`primary-${field}`"
              :class="[
                'flex flex-col gap-1',
                field === 'content' ? 'flex-1 min-h-[300px]' : ''
              ]"
            >
              <div class="flex items-center justify-between h-5">
                <label class="text-xs font-medium text-muted uppercase tracking-wide">
                  {{ field }}
                </label>
                <!-- AI Translate button for primary locale -->
                <AITranslateButton
                  v-if="showAiTranslate && !isBlockEditorField(field)"
                  :source-text="getBestSourceText(field, primaryEditingLocale)"
                  :source-language="findBestSourceLocale(field, primaryEditingLocale)"
                  :target-language="primaryEditingLocale"
                  :field-type="fieldType || field"
                  :existing-translations="getAllTranslationsForField(field)"
                  size="2xs"
                  icon-only
                  @translate="(text) => updateFieldValue(field, text, primaryEditingLocale)"
                />
                <!-- Block editor translation for primary locale -->
                <AITranslateButton
                  v-if="showAiTranslate && isBlockEditorField(field)"
                  :loading="isFieldTranslating(field, primaryEditingLocale)"
                  :disabled="!hasSourceContent(field, primaryEditingLocale)"
                  :tooltip="getTranslateTooltip(field, primaryEditingLocale)"
                  size="2xs"
                  icon-only
                  is-block-editor
                  @click="requestBlockTranslation(field, primaryEditingLocale)"
                />
              </div>

              <!-- CroutonEditorSimple -->
              <div
                v-if="getFieldComponent(field) === 'CroutonEditorSimple'"
                class="flex-1 border rounded-md overflow-hidden border-default"
              >
                <div class="h-full min-h-[200px]">
                  <CroutonEditorSimple
                    :model-value="getFieldValue(field, primaryEditingLocale)"
                    @update:model-value="updateFieldValue(field, $event, primaryEditingLocale)"
                  />
                </div>
              </div>

              <!-- CroutonPagesEditorBlockEditor -->
              <div
                v-else-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditor'"
                class="flex-1 border rounded-md overflow-hidden border-default"
              >
                <div class="h-full min-h-[350px]">
                  <CroutonPagesEditorBlockEditor
                    :model-value="collab ? undefined : getFieldValue(field, primaryEditingLocale)"
                    :yxml-fragment="collab?.getXmlFragment(primaryEditingLocale)"
                    :collab-provider="collab?.connection"
                    :collab-user="collab?.user"
                    :editable="true"
                    placeholder="Type / to insert a block..."
                    @update:model-value="!collab && updateFieldValue(field, $event, primaryEditingLocale)"
                  />
                </div>
              </div>

              <!-- CroutonPagesEditorBlockEditorWithPreview -->
              <div
                v-else-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditorWithPreview'"
                class="flex-1 min-h-[350px] max-h-[600px]"
              >
                <CroutonPagesEditorBlockEditorWithPreview
                  :model-value="collab ? undefined : getFieldValue(field, primaryEditingLocale)"
                  :yxml-fragment="collab?.getXmlFragment(primaryEditingLocale)"
                  :collab-provider="collab?.connection"
                  :collab-user="collab?.user"
                  :editable="true"
                  placeholder="Type / to insert a block..."
                  @update:model-value="!collab && updateFieldValue(field, $event, primaryEditingLocale)"
                />
              </div>

              <!-- UTextarea -->
              <UTextarea
                v-else-if="getFieldComponent(field) === 'UTextarea'"
                :model-value="getFieldValue(field, primaryEditingLocale)"
                :placeholder="defaultValues?.[field] || ''"
                :color="error && !getFieldValue(field, primaryEditingLocale) ? 'error' : 'primary'"
                :highlight="!!(error && !getFieldValue(field, primaryEditingLocale))"
                class="w-full"
                size="sm"
                @update:model-value="updateFieldValue(field, $event, primaryEditingLocale)"
              />

              <!-- UInput (default) -->
              <UInput
                v-else
                :model-value="getFieldValue(field, primaryEditingLocale)"
                :placeholder="defaultValues?.[field] || ''"
                :color="error && !getFieldValue(field, primaryEditingLocale) ? 'error' : 'primary'"
                :highlight="!!(error && !getFieldValue(field, primaryEditingLocale))"
                class="w-full"
                size="sm"
                @update:model-value="updateFieldValue(field, $event, primaryEditingLocale)"
              />
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Secondary locale (selectable) -->
        <div class="flex flex-col min-h-0">
          <!-- Column header - matches height of left column -->
          <div class="flex items-center gap-2 h-7 mb-3 border-b border-default">
            <USelect
              v-model="secondaryEditingLocale"
              :items="rightLocaleOptions"
              value-key="value"
              size="xs"
              class="flex-1"
            />
            <UIcon
              v-if="isLocaleComplete(secondaryEditingLocale)"
              name="i-lucide-check-circle"
              class="text-green-500 size-3.5"
            />
          </div>

          <!-- Secondary locale fields -->
          <div class="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto">
            <div
              v-for="field in fields"
              :key="`secondary-${field}`"
              :class="[
                'flex flex-col gap-1',
                field === 'content' ? 'flex-1 min-h-[300px]' : ''
              ]"
            >
              <div class="flex items-center justify-between h-5">
                <label class="text-xs font-medium text-muted uppercase tracking-wide">
                  {{ field }}
                </label>
                <!-- AI Translate button - uses stub (renders nothing) if crouton-ai not extended -->
                <AITranslateButton
                  v-if="showAiTranslate && !isBlockEditorField(field)"
                  :source-text="getBestSourceText(field, secondaryEditingLocale)"
                  :source-language="findBestSourceLocale(field, secondaryEditingLocale)"
                  :target-language="secondaryEditingLocale"
                  :field-type="fieldType || field"
                  :existing-translations="getAllTranslationsForField(field)"
                  size="2xs"
                  icon-only
                  @translate="(text) => updateFieldValue(field, text, secondaryEditingLocale)"
                />
                <!-- Block editor translation (controlled mode) -->
                <AITranslateButton
                  v-if="showAiTranslate && isBlockEditorField(field)"
                  :loading="isFieldTranslating(field, secondaryEditingLocale)"
                  :disabled="!hasSourceContent(field, secondaryEditingLocale)"
                  :tooltip="getTranslateTooltip(field, secondaryEditingLocale)"
                  size="2xs"
                  icon-only
                  is-block-editor
                  @click="requestBlockTranslation(field, secondaryEditingLocale)"
                />
              </div>

              <!-- CroutonEditorSimple -->
              <div
                v-if="getFieldComponent(field) === 'CroutonEditorSimple'"
                class="flex-1 border rounded-md overflow-hidden border-default"
              >
                <div class="h-full min-h-[200px]">
                  <CroutonEditorSimple
                    :model-value="getFieldValue(field, secondaryEditingLocale)"
                    @update:model-value="updateFieldValue(field, $event, secondaryEditingLocale)"
                  />
                </div>
              </div>

              <!-- CroutonPagesEditorBlockEditor -->
              <div
                v-else-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditor'"
                class="flex-1 border rounded-md overflow-hidden border-default"
              >
                <div class="h-full min-h-[350px]">
                  <CroutonPagesEditorBlockEditor
                    :model-value="collab ? undefined : getFieldValue(field, secondaryEditingLocale)"
                    :yxml-fragment="collab?.getXmlFragment(secondaryEditingLocale)"
                    :collab-provider="collab?.connection"
                    :collab-user="collab?.user"
                    :editable="true"
                    placeholder="Type / to insert a block..."
                    @update:model-value="!collab && updateFieldValue(field, $event, secondaryEditingLocale)"
                  />
                </div>
              </div>

              <!-- CroutonPagesEditorBlockEditorWithPreview -->
              <div
                v-else-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditorWithPreview'"
                class="flex-1 min-h-[350px] max-h-[600px]"
              >
                <CroutonPagesEditorBlockEditorWithPreview
                  :model-value="collab ? undefined : getFieldValue(field, secondaryEditingLocale)"
                  :yxml-fragment="collab?.getXmlFragment(secondaryEditingLocale)"
                  :collab-provider="collab?.connection"
                  :collab-user="collab?.user"
                  :editable="true"
                  placeholder="Type / to insert a block..."
                  @update:model-value="!collab && updateFieldValue(field, $event, secondaryEditingLocale)"
                />
              </div>

              <!-- UTextarea -->
              <UTextarea
                v-else-if="getFieldComponent(field) === 'UTextarea'"
                :model-value="getFieldValue(field, secondaryEditingLocale)"
                :placeholder="getFieldValue(field, primaryEditingLocale) ? `${primaryEditingLocale.toUpperCase()}: ${getFieldValue(field, primaryEditingLocale)}` : ''"
                class="w-full"
                size="sm"
                @update:model-value="updateFieldValue(field, $event, secondaryEditingLocale)"
              />

              <!-- UInput (default) -->
              <UInput
                v-else
                :model-value="getFieldValue(field, secondaryEditingLocale)"
                :placeholder="getFieldValue(field, primaryEditingLocale) ? `${primaryEditingLocale.toUpperCase()}: ${getFieldValue(field, primaryEditingLocale)}` : ''"
                class="w-full"
                size="sm"
                @update:model-value="updateFieldValue(field, $event, secondaryEditingLocale)"
              />

            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ============================================= -->
    <!-- TABS LAYOUT (default, for narrow containers) -->
    <!-- ============================================= -->
    <template v-else>
      <!-- Language selector with status indicators -->
      <div class="flex items-center justify-between">
        <UFieldGroup class="w-full">
          <UButton
            v-for="loc in locales"
            :key="typeof loc === 'string' ? loc : loc.code"
            :variant="editingLocale === (typeof loc === 'string' ? loc : loc.code) ? 'solid' : 'outline'"
            size="sm"
            class="w-full"
            @click="editingLocale = typeof loc === 'string' ? loc : loc.code"
          >
            <span class="flex items-center gap-2">
              {{ (typeof loc === 'string' ? loc : loc.code).toUpperCase() }}
              <span
                v-if="(typeof loc === 'string' ? loc : loc.code) === 'en'"
                class="text-red-500"
              >*</span>
              <UIcon
                v-if="translationStatus.find(s => s.locale === (typeof loc === 'string' ? loc : loc.code))?.complete"
                name="i-lucide-check-circle"
                class="text-green-500"
              />
            </span>
          </UButton>
        </UFieldGroup>
      </div>

      <!-- Multi-field mode: show inputs for each field -->
      <div
        v-if="isMultiField"
        class="space-y-3"
      >
        <UFormField
          v-for="field in fields"
          :key="field"
          :label="`${field.charAt(0).toUpperCase() + field.slice(1)} (${editingLocale.toUpperCase()})${editingLocale === 'en' ? ' *' : ''}`"
          :name="`translations.${editingLocale}.${field}`"
          :required="editingLocale === 'en'"
        >
          <!-- CroutonEditorSimple (rich text editor) - needs height container -->
          <div
            v-if="getFieldComponent(field) === 'CroutonEditorSimple'"
            class="border rounded-lg overflow-hidden border-gray-300 dark:border-gray-700"
          >
            <div class="h-64">
              <CroutonEditorSimple
                :model-value="getFieldValue(field, editingLocale)"
                @update:model-value="updateFieldValue(field, $event)"
              />
            </div>
          </div>

          <!-- CroutonPagesEditorBlockEditor (block-based page editor) -->
          <div
            v-else-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditor'"
            class="border rounded-lg overflow-hidden border-gray-300 dark:border-gray-700"
          >
            <div class="min-h-[400px]">
              <CroutonPagesEditorBlockEditor
                :model-value="collab ? undefined : getFieldValue(field, editingLocale)"
                :yxml-fragment="collab?.getXmlFragment(editingLocale)"
                :collab-provider="collab?.connection"
                :collab-user="collab?.user"
                :editable="true"
                placeholder="Type / to insert a block..."
                @update:model-value="!collab && updateFieldValue(field, $event)"
              />
            </div>
          </div>

          <!-- CroutonPagesEditorBlockEditorWithPreview (block editor with preview toggle) -->
          <div
            v-else-if="getFieldComponent(field) === 'CroutonPagesEditorBlockEditorWithPreview'"
            class="h-[500px] min-h-[350px] max-h-[600px]"
          >
            <CroutonPagesEditorBlockEditorWithPreview
              :model-value="collab ? undefined : getFieldValue(field, editingLocale)"
              :yxml-fragment="collab?.getXmlFragment(editingLocale)"
              :collab-provider="collab?.connection"
              :collab-user="collab?.user"
              :editable="true"
              placeholder="Type / to insert a block..."
              @update:model-value="!collab && updateFieldValue(field, $event)"
            />
          </div>

          <!-- UTextarea (for text type fields without custom component) -->
          <UTextarea
            v-else-if="getFieldComponent(field) === 'UTextarea'"
            :model-value="getFieldValue(field, editingLocale)"
            :placeholder="editingLocale !== 'en' && getFieldValue(field, 'en') ? `Fallback: ${getFieldValue(field, 'en')}` : (defaultValues?.[field] || '')"
            :color="error && editingLocale === 'en' && !getFieldValue(field, editingLocale) ? 'error' : 'primary'"
            :highlight="!!(error && editingLocale === 'en' && !getFieldValue(field, editingLocale))"
            class="w-full"
            size="lg"
            @update:model-value="updateFieldValue(field, $event)"
          />

          <!-- UInput (default) -->
          <UInput
            v-else
            :model-value="getFieldValue(field, editingLocale)"
            :placeholder="editingLocale !== 'en' && getFieldValue(field, 'en') ? `Fallback: ${getFieldValue(field, 'en')}` : (defaultValues?.[field] || '')"
            :color="error && editingLocale === 'en' && !getFieldValue(field, editingLocale) ? 'error' : 'primary'"
            :highlight="!!(error && editingLocale === 'en' && !getFieldValue(field, editingLocale))"
            class="w-full"
            size="lg"
            @update:model-value="updateFieldValue(field, $event)"
          />

          <!-- Show source reference when other locales have content -->
          <div
            v-if="hasSourceContent(field, editingLocale)"
            class="flex items-center gap-2 mt-1"
          >
            <!-- For block editors, don't show raw JSON -->
            <template v-if="isBlockEditorField(field)">
              <p class="text-xs text-gray-500">
                <UIcon name="i-lucide-file-text" class="inline w-3 h-3 mr-1" />
                {{ findBestSourceLocale(field, editingLocale)?.toUpperCase() }} version available
              </p>
            </template>
            <!-- For text fields, show the actual text -->
            <template v-else>
              <p class="text-xs text-gray-500">
                {{ findBestSourceLocale(field, editingLocale)?.toUpperCase() }}: {{ getFieldValue(field, findBestSourceLocale(field, editingLocale) || 'en') }}
              </p>
            </template>
            <!-- AI Translate button - uses stub (renders nothing) if crouton-ai not extended -->
            <AITranslateButton
              v-if="showAiTranslate && !isBlockEditorField(field)"
              :source-text="getBestSourceText(field, editingLocale)"
              :source-language="findBestSourceLocale(field, editingLocale)"
              :target-language="editingLocale"
              :field-type="fieldType || field"
              :existing-translations="getAllTranslationsForField(field)"
              @translate="(text) => updateFieldValue(field, text, editingLocale)"
            />
            <!-- Block editor translation (controlled mode) -->
            <AITranslateButton
              v-if="showAiTranslate && isBlockEditorField(field)"
              :loading="isFieldTranslating(field, editingLocale)"
              :disabled="!hasSourceContent(field, editingLocale)"
              :tooltip="getTranslateTooltip(field, editingLocale)"
              is-block-editor
              @click="requestBlockTranslation(field, editingLocale)"
            />
          </div>
        </UFormField>
      </div>

      <!-- Single field mode (backwards compat) -->
      <div
        v-else
        class="space-y-3"
      >
        <UFormField
          :label="`Translation (${editingLocale.toUpperCase()})${editingLocale === 'en' ? ' *' : ''}`"
          :name="`values.${editingLocale}`"
          :required="editingLocale === 'en'"
        >
          <UInput
            :model-value="getFieldValue('', editingLocale)"
            :placeholder="editingLocale !== 'en' && getFieldValue('', 'en') ? `Fallback: ${getFieldValue('', 'en')}` : ''"
            :color="error && editingLocale === 'en' && !getFieldValue('', editingLocale) ? 'error' : 'primary'"
            :highlight="!!(error && editingLocale === 'en' && !getFieldValue('', editingLocale))"
            class="w-full"
            size="lg"
            @update:model-value="updateFieldValue('', $event)"
          />
        </UFormField>

        <!-- Show source reference when other locales have content -->
        <div
          v-if="hasSourceContent('', editingLocale)"
          class="flex items-center gap-2 mt-1"
        >
          <p class="text-xs text-gray-500">
            {{ findBestSourceLocale('', editingLocale)?.toUpperCase() }}: {{ getFieldValue('', findBestSourceLocale('', editingLocale) || 'en') }}
          </p>
          <!-- AI Translate button - uses stub (renders nothing) if crouton-ai not extended -->
          <AITranslateButton
            v-if="showAiTranslate"
            :source-text="getBestSourceText('', editingLocale)"
            :source-language="findBestSourceLocale('', editingLocale)"
            :target-language="editingLocale"
            :field-type="fieldType"
            :existing-translations="getAllTranslationsForField('')"
            @translate="(text) => updateFieldValue('', text, editingLocale)"
          />
        </div>
      </div>
    </template>
  </div>
</template>
