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
  <CrudTable
    collection="${prefixedCamelCasePlural}"
    :columns="columns"
    :rows="collection${prefixedPascalCasePlural}"
  >
    <template #header>
      <CrudTableHeader
        title="${prefixedPascalCasePlural}"
        :collection="'${prefixedCamelCasePlural}'"
        createButton
      />
    </template>${translatableFields.map(field => `
    <template #${field}-data="{ row }">
      {{ t(row, '${field}') }}
    </template>`).join('')}
  </CrudTable>
</template>

<script setup lang="ts">${hasTranslations ? `
const { t } = useEntityTranslations()
const { locale } = useI18n()` : ''}
const { columns } = use${prefixedPascalCasePlural}()
const { currentTeam } = useTeam()
const { ${prefixedCamelCasePlural}: collection${prefixedPascalCasePlural} } = useCollections()

const { data: ${plural}, refresh } = await useFetch(
  \`/api/teams/\${currentTeam.value.id}/${apiPath}\`,
  {${hasTranslations ? `
    query: { locale: locale.value },` : ''}
    watch: [currentTeam${hasTranslations ? ', locale' : ''}],
  },
)

// Directly assign the fetched ${plural} to the collection
if (${plural}.value) {
  collection${prefixedPascalCasePlural}.value = ${plural}.value
}
</script>`
}