// Generator for List.vue component

export function generateListComponent(data, config = {}) {
  const { plural, pascalCasePlural, layerPascalCase, layer } = data
  const prefixedPascalCasePlural = `${layerPascalCase}${pascalCasePlural}`
  const prefixedCamelCasePlural = `${layer}${pascalCasePlural}`
  const apiPath = `${layer}-${plural}`
  
  // Check for translations
  const translatableFields = config?.translations?.collections?.[plural] || []
  const hasTranslations = translatableFields.length > 0

  return `<template>
  <CroutonList
    :layout="layout"
    collection="${prefixedCamelCasePlural}"
    :columns="columns"
    :rows="${plural} || []"
    :loading="pending"
  >
    <template #header>
      <CroutonTableHeader
        title="${prefixedPascalCasePlural}"
        :collection="'${prefixedCamelCasePlural}'"
        createButton
      />
    </template>${translatableFields.map(field => `
    <template #${field}-data="{ row }">
      {{ t(row, '${field}') }}
    </template>`).join('')}${hasTranslations ? `
    <template #translations-data="{ row }">
      <div class="flex gap-1">
        <UBadge
          v-for="loc in locales"
          :key="typeof loc === 'string' ? loc : loc.code"
          :color="hasTranslation(row, typeof loc === 'string' ? loc : loc.code) ? 'primary' : 'neutral'"
          variant="subtle"
          size="xs"
        >
          {{ (typeof loc === 'string' ? loc : loc.code).toUpperCase() }}
        </UBadge>
      </div>
    </template>` : ''}
  </CroutonList>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  layout?: any
}>(), {
  layout: 'table'
})
${hasTranslations ? `
const { t } = useEntityTranslations()
const { locale, locales } = useI18n()

// Check if a translation exists for a specific locale
function hasTranslation(row: any, localeCode: string): boolean {
  if (!row.translations) return false
  const localeData = row.translations[localeCode]
  if (!localeData || typeof localeData !== 'object') return false
  // Check if any translatable field has a value
  return ${JSON.stringify(translatableFields)}.some((field: string) => {
    return localeData[field] && localeData[field].trim() !== ''
  })
}` : ''}
const { columns } = use${prefixedPascalCasePlural}()

const { items: ${plural}, pending } = await useCollectionQuery(
  '${prefixedCamelCasePlural}',
  {${hasTranslations ? `
    query: computed(() => ({ locale: locale.value }))` : ''}
  }
)
</script>`
}