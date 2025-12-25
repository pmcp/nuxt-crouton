<script setup lang="ts">
/**
 * Slot Input - Repeater item for translatable time slots
 *
 * Data structure:
 * {
 *   id: string,
 *   label: string,      // Default label (English)
 *   value?: string,     // Optional value/key
 *   translations?: {    // Optional translations for label
 *     label: { nl: "Dutch", fr: "French", ... }
 *   }
 * }
 */
import { nanoid } from 'nanoid'

interface SlotItemData {
  id: string
  label?: string
  value?: string
  translations?: {
    label?: Record<string, string>
  }
}

const props = defineProps<{
  modelValue: SlotItemData
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SlotItemData]
}>()

const { locale, locales } = useI18n()

// Ensure stable ID on first creation
if (props.modelValue && !props.modelValue.id) {
  emit('update:modelValue', { ...props.modelValue, id: nanoid() })
}

// Track which locale we're editing
const editingLocale = ref(locale.value)

// Get translation for current editing locale
function getTranslation(localeCode: string): string {
  if (localeCode === 'en') {
    return props.modelValue?.label || ''
  }
  return props.modelValue?.translations?.label?.[localeCode] || ''
}

// Set translation for a specific locale
function setTranslation(localeCode: string, val: string) {
  if (localeCode === 'en') {
    // English is stored in the main label field
    emit('update:modelValue', {
      ...props.modelValue,
      label: val
    })
  } else {
    // Other languages stored in translations
    const currentTranslations = props.modelValue?.translations || {}
    const labelTranslations = { ...(currentTranslations.label || {}) }

    if (val) {
      labelTranslations[localeCode] = val
    } else {
      delete labelTranslations[localeCode]
    }

    emit('update:modelValue', {
      ...props.modelValue,
      translations: {
        ...currentTranslations,
        label: labelTranslations
      }
    })
  }
}

// Check if a locale has a translation
function hasTranslation(localeCode: string): boolean {
  if (localeCode === 'en') {
    return !!(props.modelValue?.label?.trim())
  }
  return !!(props.modelValue?.translations?.label?.[localeCode]?.trim())
}
</script>

<template>
  <div class="space-y-2">
    <!-- Language selector -->
    <div class="flex items-center gap-1">
      <UButton
        v-for="loc in locales"
        :key="typeof loc === 'string' ? loc : loc.code"
        :variant="editingLocale === (typeof loc === 'string' ? loc : loc.code) ? 'solid' : 'ghost'"
        :color="editingLocale === (typeof loc === 'string' ? loc : loc.code) ? 'primary' : 'neutral'"
        size="xs"
        @click="editingLocale = typeof loc === 'string' ? loc : loc.code"
      >
        <span class="flex items-center gap-1">
          {{ (typeof loc === 'string' ? loc : loc.code).toUpperCase() }}
          <UIcon
            v-if="hasTranslation(typeof loc === 'string' ? loc : loc.code)"
            name="i-lucide-check"
            class="w-3 h-3 text-success"
          />
        </span>
      </UButton>
    </div>

    <!-- Label input (translatable) -->
    <UFormField
      :label="`Slot Label (${editingLocale.toUpperCase()})${editingLocale === 'en' ? ' *' : ''}`"
      :required="editingLocale === 'en'"
    >
      <UInput
        :model-value="getTranslation(editingLocale)"
        :placeholder="editingLocale !== 'en' && getTranslation('en')
          ? `Fallback: ${getTranslation('en')}`
          : 'e.g. Morning, Afternoon, 09:00-12:00'"
        class="w-full"
        size="lg"
        @update:model-value="setTranslation(editingLocale, $event)"
      />
      <template v-if="editingLocale !== 'en' && getTranslation('en')" #hint>
        <span class="text-xs text-muted">English: {{ getTranslation('en') }}</span>
      </template>
    </UFormField>
  </div>
</template>
