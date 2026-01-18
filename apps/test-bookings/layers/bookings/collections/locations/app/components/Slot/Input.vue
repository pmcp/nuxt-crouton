<script setup lang="ts">
/**
 * Translatable repeater item component
 * Supports multiple languages with item-level translations
 */
import { nanoid } from 'nanoid'

interface BookingsLocationsSlotItem {
  id: string
  label: string
  description?: string
  value?: string
  startTime?: string
  endTime?: string
  maxCapacity?: number
  translations?: Record<string, Record<string, string>>
}

const model = defineModel<BookingsLocationsSlotItem>()

const { locale, locales } = useI18n()

// Track which locale we're editing
const editingLocale = ref(locale.value)

// Ensure stable ID on first creation
if (model.value && !model.value.id) {
  model.value = { ...model.value, id: nanoid() }
}

// Get value for a property (respects current editing locale)
function getValue(propName: string): string {
  if (!model.value) return ''

  if (editingLocale.value === 'en') {
    return (model.value as any)[propName] || ''
  }

  // Return translated value or empty string
  return model.value.translations?.[propName]?.[editingLocale.value] || ''
}

// Set value for a property (respects current editing locale)
function setValue(propName: string, value: string) {
  if (!model.value) return

  if (editingLocale.value === 'en') {
    // English is stored in the main property
    model.value = {
      ...model.value,
      [propName]: value
    }
  } else {
    // Other languages stored in translations
    const currentTranslations = model.value.translations || {}
    const propTranslations = { ...(currentTranslations[propName] || {}) }

    if (value) {
      propTranslations[editingLocale.value] = value
    } else {
      delete propTranslations[editingLocale.value]
    }

    model.value = {
      ...model.value,
      translations: {
        ...currentTranslations,
        [propName]: propTranslations
      }
    }
  }
}

// Check if a locale has a translation for a property
function hasTranslation(propName: string, localeCode: string): boolean {
  if (!model.value) return false

  if (localeCode === 'en') {
    return !!((model.value as any)[propName]?.trim?.())
  }
  return !!(model.value.translations?.[propName]?.[localeCode]?.trim?.())
}

// Check if a locale has ALL required translations
function localeComplete(localeCode: string): boolean {
  const requiredProps = ["label"]
  if (requiredProps.length === 0) return true
  return requiredProps.every(prop => hasTranslation(prop, localeCode))
}

// Get English value for fallback display
function getEnglishValue(propName: string): string {
  if (!model.value) return ''
  return (model.value as any)[propName] || ''
}
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
            v-if="localeComplete(typeof loc === 'string' ? loc : loc.code)"
            name="i-lucide-check"
            class="w-3 h-3 text-success"
          />
        </span>
      </UButton>
    </div>

    <!-- Slot Name (translatable) -->
    <UFormField
      :label="`Slot Name (${editingLocale.toUpperCase()})${editingLocale === 'en' ? ' *' : ''}`"
      :required="editingLocale === 'en'"
    >
      <UInput
        :model-value="getValue('label')"
        :placeholder="editingLocale !== 'en' && getEnglishValue('label')
          ? `Fallback: ${getEnglishValue('label')}`
          : 'Enter slot name'"
        class="w-full"
        @update:model-value="setValue('label', $event)"
      />
      <template v-if="editingLocale !== 'en' && getEnglishValue('label')" #hint>
        <span class="text-xs text-muted">English: {{ getEnglishValue('label') }}</span>
      </template>
    </UFormField>

    <!-- Description (translatable) -->
    <UFormField
      :label="`Description (${editingLocale.toUpperCase()})`"
      
    >
      <UTextarea
        :model-value="getValue('description')"
        :placeholder="editingLocale !== 'en' && getEnglishValue('description')
          ? `Fallback: ${getEnglishValue('description')}`
          : 'Enter description'"
        class="w-full"
        @update:model-value="setValue('description', $event)"
      />
      <template v-if="editingLocale !== 'en' && getEnglishValue('description')" #hint>
        <span class="text-xs text-muted">English: {{ getEnglishValue('description') }}</span>
      </template>
    </UFormField>

    <!-- Slot ID (non-translatable, English only) -->
    <UFormField
      v-if="editingLocale === 'en' && model"
      label="Slot ID"
      
    >
      <UInput
        v-model="model.value"
        placeholder="Enter slot id"
        class="w-full"
      />
    </UFormField>

    <!-- Start Time (non-translatable, English only) -->
    <UFormField
      v-if="editingLocale === 'en' && model"
      label="Start Time"
      
    >
      <UInput
        v-model="model.startTime"
        placeholder="Enter start time"
        class="w-full"
      />
    </UFormField>

    <!-- End Time (non-translatable, English only) -->
    <UFormField
      v-if="editingLocale === 'en' && model"
      label="End Time"
      
    >
      <UInput
        v-model="model.endTime"
        placeholder="Enter end time"
        class="w-full"
      />
    </UFormField>

    <!-- Max Capacity (non-translatable, English only) -->
    <UFormField
      v-if="editingLocale === 'en' && model"
      label="Max Capacity"
      
    >
      <UInput type="number"
        v-model="model.maxCapacity"
        placeholder="Enter max capacity"
        class="w-full"
      />
    </UFormField>
  </div>
</template>
