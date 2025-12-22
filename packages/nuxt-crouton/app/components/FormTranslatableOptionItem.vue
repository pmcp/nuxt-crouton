<script setup lang="ts">
/**
 * TranslatableOptionItem - Repeater item for translatable dropdown options
 *
 * Used with FormRepeater for fields like statuses, groups, categories that need
 * both a value (slug) and translatable labels.
 *
 * Data structure:
 * {
 *   id: string,
 *   label: string,      // Default label (English)
 *   value: string,      // Slug/key for the option
 *   translations?: {    // Optional translations for label
 *     label: { nl: "Dutch", fr: "French", ... }
 *   }
 * }
 */

interface OptionItemData {
  id: string
  label: string
  value: string
  translations?: {
    label?: Record<string, string>
  }
}

const props = defineProps<{
  modelValue: OptionItemData
}>()

const emit = defineEmits<{
  'update:modelValue': [value: OptionItemData]
}>()

const { locale, locales } = useI18n()

// Track which locale we're editing
const editingLocale = ref(locale.value)

// Local state synced with modelValue
const label = computed({
  get: () => props.modelValue?.label || '',
  set: (val: string) => {
    emit('update:modelValue', {
      ...props.modelValue,
      label: val,
      // Auto-generate value from label if value is empty
      value: props.modelValue?.value || slugify(val)
    })
  }
})

const value = computed({
  get: () => props.modelValue?.value || '',
  set: (val: string) => {
    emit('update:modelValue', {
      ...props.modelValue,
      value: val
    })
  }
})

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

// Slugify helper for auto-generating value
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

// Auto-generate value from label when label changes (if value is empty or matches old slug)
const previousLabelSlug = ref(slugify(props.modelValue?.label || ''))

watch(() => props.modelValue?.label, (newLabel) => {
  if (!newLabel) return

  const newSlug = slugify(newLabel)
  const currentValue = props.modelValue?.value || ''

  // Auto-update value if it's empty or matches the previous auto-generated slug
  if (!currentValue || currentValue === previousLabelSlug.value) {
    emit('update:modelValue', {
      ...props.modelValue,
      value: newSlug
    })
  }

  previousLabelSlug.value = newSlug
})
</script>

<template>
  <div class="space-y-3">
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
      :label="`Label (${editingLocale.toUpperCase()})${editingLocale === 'en' ? ' *' : ''}`"
      :required="editingLocale === 'en'"
    >
      <UInput
        :model-value="getTranslation(editingLocale)"
        :placeholder="editingLocale !== 'en' && getTranslation('en')
          ? `Fallback: ${getTranslation('en')}`
          : 'Display name'"
        class="w-full"
        @update:model-value="setTranslation(editingLocale, $event)"
      />
      <template v-if="editingLocale !== 'en' && getTranslation('en')" #hint>
        <span class="text-xs text-muted">English: {{ getTranslation('en') }}</span>
      </template>
    </UFormField>

    <!-- Value input (slug, not translatable) -->
    <UFormField
      v-if="editingLocale === 'en'"
      label="Value"
    >
      <UInput
        v-model="value"
        :placeholder="slugify(label) || 'auto-generated-from-label'"
        class="w-full"
      />
      <template #hint>
        <span class="text-xs text-muted">
          Internal identifier (auto-generated from label if left empty)
        </span>
      </template>
    </UFormField>
  </div>
</template>
