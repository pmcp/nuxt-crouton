<script setup lang="ts">
// Component to display translation status badges for an entity
const props = defineProps<{
  item: any // The row/entity with translations
  fields: string[] // Translatable fields to check
}>()

const { locales } = useI18n()

// Check if a translation exists for a specific locale
function hasTranslation(localeCode: string): boolean {
  if (!props.item?.translations) return false
  const localeData = props.item.translations[localeCode]
  if (!localeData || typeof localeData !== 'object') return false

  // Check if any translatable field has a value
  return props.fields.some((field: string) => {
    return localeData[field] && localeData[field].trim() !== ''
  })
}
</script>

<template>
  <div class="flex gap-1">
    <CroutonI18nCardsMini
      v-for="loc in locales"
      :key="typeof loc === 'string' ? loc : loc.code"
      :locale="typeof loc === 'string' ? loc : loc.code"
      :has-translation="hasTranslation(typeof loc === 'string' ? loc : loc.code)"
    />
  </div>
</template>
