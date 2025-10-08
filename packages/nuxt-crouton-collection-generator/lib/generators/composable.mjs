// Generator for use[Collection].ts composable

export function generateComposable(data, config = {}) {
  const { singular, plural, pascalCase, pascalCasePlural, layerPascalCase, layer } = data
  const prefixedSingular = `${layerPascalCase.toLowerCase()}${pascalCase}`
  const prefixedPlural = `${layerPascalCase.toLowerCase()}${pascalCasePlural}`
  const prefixedPascalCasePlural = `${layerPascalCase}${pascalCasePlural}`
  
  // Create kebab-case API path with layer prefix
  const apiPath = `${layer}-${plural}`

  // Runtime component handles default columns (created_at, updated_at, actions)
  const columns = data.fieldsColumns

  return `import { z } from 'zod'

export const ${prefixedSingular}Schema = z.object({
  ${data.fieldsSchema}
})

export const ${prefixedPlural}Columns = [
  ${columns}
]

export const ${prefixedPlural}Config = {
  name: '${prefixedPlural}',
  layer: '${layer}',
  apiPath: '${apiPath}',
  componentName: '${layerPascalCase}${pascalCasePlural}Form',
  schema: ${prefixedSingular}Schema,
  defaultValues: {
    ${data.fieldsDefault}
  },
  columns: ${prefixedPlural}Columns,
}

export const use${prefixedPascalCasePlural} = () => ${prefixedPlural}Config

// Default export for auto-import compatibility
export default function () {
  return {
    defaultValue: ${prefixedPlural}Config.defaultValues,
    schema: ${prefixedPlural}Config.schema,
    columns: ${prefixedPlural}Config.columns,
    collection: ${prefixedPlural}Config.name
  }
}`
}