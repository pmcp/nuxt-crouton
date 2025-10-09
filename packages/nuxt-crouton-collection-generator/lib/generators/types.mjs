// Generator for TypeScript types
export function generateTypes(data, config = null) {
  const { pascalCase, pascalCasePlural, layerPascalCase, singular, layer, plural } = data
  const prefixedPascalCase = `${layerPascalCase}${pascalCase}`
  const prefixedPascalCasePlural = `${layerPascalCase}${pascalCasePlural}`
  const prefixedSingular = `${layerPascalCase.toLowerCase()}${pascalCase}`

  const composablePath = `./app/composables/use${prefixedPascalCasePlural}`

  // Conditional field generation based on config flags
  const useTeamUtility = config?.flags?.useTeamUtility ?? false
  const useMetadata = config?.flags?.useMetadata ?? true

  // Build team fields conditionally
  const teamFields = useTeamUtility ? `  teamId: string
  owner: string
` : ''

  // Build metadata fields conditionally
  const metadataFields = useMetadata ? `  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
` : ''

  // Build the omit list for New${prefixedPascalCase} type
  const omitFields = ['id']
  if (useMetadata) {
    omitFields.push('createdAt', 'updatedAt', 'createdBy', 'updatedBy')
  }
  const omitList = omitFields.map(f => `'${f}'`).join(' | ')

  return `import type { z } from 'zod'
import type { ${prefixedSingular}Schema } from '${composablePath}'

export interface ${prefixedPascalCase} {
  id: string
${teamFields}  ${data.fieldsTypes}
${metadataFields}  optimisticId?: string
  optimisticAction?: 'create' | 'update' | 'delete'
}

export type ${prefixedPascalCase}FormData = z.infer<typeof ${prefixedSingular}Schema>
export type New${prefixedPascalCase} = Omit<${prefixedPascalCase}, ${omitList}>

// Props type for the Form component
export interface ${prefixedPascalCase}FormProps {
  items: string[] // Array of IDs for delete action
  activeItem: ${prefixedPascalCase} | Record<string, never> // ${prefixedPascalCase} for update, empty object for create
  collection: string
  loading: string
  action: 'create' | 'update' | 'delete'
}`
}
