<script setup lang="ts">
// This component handles translations for both:
// 1. Single field: { en: "value", nl: "waarde" }
// 2. Multiple fields: { en: { name: "...", description: "..." }, nl: { ... } }

type SingleFieldValue = Record<string, string>
type MultiFieldValue = Record<string, Record<string, string>>
type TranslationsValue = SingleFieldValue | MultiFieldValue | null

const props = defineProps<{
  modelValue: TranslationsValue
  fields: string[] // Fields to translate e.g., ['name', 'description']
  label?: string
  error?: string | boolean
  defaultValues?: Record<string, string> // Default values for each field (from main form fields)
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TranslationsValue]
}>()

const { locale, locales } = useI18n()

// Track which locale we're editing
const editingLocale = ref(locale.value)

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
    const localeData = props.modelValue[localeCode] as Record<string, string> | undefined
    if (!localeData) return false

    // Check if all fields have values
    return props.fields.every(field => {
      const value = localeData[field]
      return value && value.trim() !== ''
    })
  } else {
    const value = props.modelValue[localeCode]
    return !!(value && (value as string).trim() !== '')
  }
}

// Translation status for all locales
const translationStatus = computed(() => {
  return locales.value.map(loc => {
    const localeCode = typeof loc === 'string' ? loc : loc.code
    return {
      locale: localeCode,
      complete: isLocaleComplete(localeCode)
    }
  })
})
</script>

<template>
  <div class="space-y-4">
    <!-- Help text -->
    <div class="text-xs text-gray-500 dark:text-gray-400">
      <span class="text-red-500">*</span> English translation is required. Other languages are optional and will fallback to English if not provided.
    </div>

    <!-- Language selector with status indicators -->
    <div class="flex items-center justify-between">
      <UFieldGroup class="w-full">
        <UButton
          v-for="loc in locales"
          :key="typeof loc === 'string' ? loc : loc.code"
          :variant="editingLocale === (typeof loc === 'string' ? loc : loc.code) ? 'solid' : 'outline'"
          @click="editingLocale = typeof loc === 'string' ? loc : loc.code"
          size="sm"
          class="w-full"
        >
          <span class="flex items-center gap-2">
            {{ (typeof loc === 'string' ? loc : loc.code).toUpperCase() }}
            <span v-if="(typeof loc === 'string' ? loc : loc.code) === 'en'" class="text-red-500">*</span>
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
    <div v-if="isMultiField" class="space-y-3">
      <UFormField
        v-for="field in fields"
        :key="field"
        :label="`${field.charAt(0).toUpperCase() + field.slice(1)} (${editingLocale.toUpperCase()})${editingLocale === 'en' ? ' *' : ''}`"
        :name="`translations.${editingLocale}.${field}`"
        :required="editingLocale === 'en'"
      >
        <UInput
          :model-value="getFieldValue(field, editingLocale)"
          @update:model-value="updateFieldValue(field, $event)"
          :placeholder="editingLocale !== 'en' && getFieldValue(field, 'en') ? `Fallback: ${getFieldValue(field, 'en')}` : (defaultValues?.[field] || '')"
          :color="error && editingLocale === 'en' && !getFieldValue(field, editingLocale) ? 'error' : 'primary'"
          :highlight="!!(error && editingLocale === 'en' && !getFieldValue(field, editingLocale))"
          class="w-full"
          size="lg"
        />

        <!-- Show English reference when editing other languages -->
        <p
          v-if="editingLocale !== 'en' && getFieldValue(field, 'en')"
          class="text-xs text-gray-500 mt-1"
        >
          English: {{ getFieldValue(field, 'en') }}
        </p>
      </UFormField>
    </div>

    <!-- Single field mode (backwards compat) -->
    <div v-else class="space-y-3">
      <UFormField
        :label="`Translation (${editingLocale.toUpperCase()})${editingLocale === 'en' ? ' *' : ''}`"
        :name="`values.${editingLocale}`"
        :required="editingLocale === 'en'"
      >
        <UInput
          :model-value="getFieldValue('', editingLocale)"
          @update:model-value="updateFieldValue('', $event)"
          :placeholder="editingLocale !== 'en' && getFieldValue('', 'en') ? `Fallback: ${getFieldValue('', 'en')}` : ''"
          :color="error && editingLocale === 'en' && !getFieldValue('', editingLocale) ? 'error' : 'primary'"
          :highlight="!!(error && editingLocale === 'en' && !getFieldValue('', editingLocale))"
          class="w-full"
          size="lg"
        />
      </UFormField>

      <!-- Show English reference when editing other languages -->
      <p
        v-if="editingLocale !== 'en' && getFieldValue('', 'en')"
        class="text-xs text-gray-500 mt-1"
      >
        English: {{ getFieldValue('', 'en') }}
      </p>
    </div>
  </div>
</template>
