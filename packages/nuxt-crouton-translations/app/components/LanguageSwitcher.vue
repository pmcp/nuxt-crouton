<template>
  <ULocaleSelect
    v-model="locale"
    :locales="availableLocales"
    class="w-full"
    variant="ghost"
    @update:model-value="setLocale($event)"
  >
    <template #leading="{ locale }">
      <span>{{ flags[locale.code] || '🌐' }}</span>
    </template>

    <template #item="{ locale, selected }">
      <div class="flex items-center gap-2 w-full">
        <span>{{ flags[locale.code] || '🌐' }}</span>
        <span class="flex-1">{{ locale.name }}</span>
        <UIcon
          v-if="selected"
          name="i-lucide-check"
          class="h-4 w-4 text-green-500"
        />
      </div>
    </template>
  </ULocaleSelect>
</template>

<script setup lang="ts">
import { en, nl, fr } from '@nuxt/ui/locale'

const { locale, setLocale } = useI18n()

// Map the locales to match the i18n configuration
const availableLocales = [en, nl, fr]

// Custom flags for each locale
const flags: Record<string, string> = {
  en: '🌹',
  nl: '🦁',
  fr: '🐔'
}

// define props

</script>
