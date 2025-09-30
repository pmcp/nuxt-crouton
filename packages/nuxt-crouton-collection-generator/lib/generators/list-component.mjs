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
    </template>`).join('')}
  </CroutonList>
</template>

<script setup lang="ts">
interface Props {
  layout?: 'table' | 'list' | 'grid' | 'cards'
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'table'
})

console.log('[${prefixedPascalCasePlural} List] Component mounted')
${hasTranslations ? `
const { t } = useEntityTranslations()
const { locale } = useI18n()` : ''}
const { columns } = use${prefixedPascalCasePlural}()

// NEW: Use query-based data fetching
const { items: ${plural}, pending } = await useCollectionQuery(
  '${prefixedCamelCasePlural}',
  {${hasTranslations ? `
    query: computed(() => ({ locale: locale.value }))` : ''}
  }
)

console.log('[${prefixedPascalCasePlural} List] Initial data:', ${plural}.value?.length, 'items')
${hasTranslations ? `
// Watch for locale changes
watch(locale, (newLocale) => {
  console.log('[${prefixedPascalCasePlural} List] Locale changed to:', newLocale)
})` : ''}
</script>`
}