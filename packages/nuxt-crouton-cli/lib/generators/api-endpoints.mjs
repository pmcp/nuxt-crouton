// API endpoint generators using @crouton/auth for team authentication

export function generateGetEndpoint(data, config = null) {
  const { pascalCase, pascalCasePlural, layerPascalCase, plural, singular, layer } = data
  const prefixedPascalCase = `${layerPascalCase}${pascalCase}`
  const prefixedPascalCasePlural = `${layerPascalCase}${pascalCasePlural}`

  // Check if this collection has translations
  const hasTranslations = config?.translations?.collections?.[plural] || config?.translations?.collections?.[singular]

  const queriesPath = '../../../../database/queries'

  return `// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { getAll${prefixedPascalCasePlural}, get${prefixedPascalCasePlural}ByIds } from '${queriesPath}'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team-auth'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)

  const query = getQuery(event)${hasTranslations ? `
  // Accept locale for future translation handling
  const locale = String(query.locale || 'en')` : ''}
  if (query.ids) {
    const ids = String(query.ids).split(',')
    return await get${prefixedPascalCasePlural}ByIds(team.id, ids)
  }

  return await getAll${prefixedPascalCasePlural}(team.id)
})`
}

export function generatePostEndpoint(data, config = null) {
  const { singular, pascalCase, layerPascalCase, layer, plural, fields } = data
  const prefixedPascalCase = `${layerPascalCase}${pascalCase}`

  const queriesPath = '../../../../database/queries'

  // Check if there are any date fields
  const dateFields = fields.filter(f => f.type === 'date')
  const hasDateFields = dateFields.length > 0

  // Generate date conversion code if needed
  const dateConversions = hasDateFields ? dateFields.map(field =>
    `  // Convert date string to Date object
  if (dataWithoutId.${field.name}) {
    dataWithoutId.${field.name} = new Date(dataWithoutId.${field.name})
  }`
  ).join('\n') + '\n' : ''

  return `// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { create${prefixedPascalCase} } from '${queriesPath}'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team-auth'

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody(event)

  // Exclude id field to let the database generate it
  const { id, ...dataWithoutId } = body

${dateConversions}  return await create${prefixedPascalCase}({
    ...dataWithoutId,
    teamId: team.id,
    owner: user.id,
    createdBy: user.id,
    updatedBy: user.id
  })
})`
}

export function generatePatchEndpoint(data, config = null) {
  const { singular, pascalCase, pascalCasePlural, layerPascalCase, fields, plural, layer } = data
  const prefixedPascalCase = `${layerPascalCase}${pascalCase}`
  const prefixedPascalCasePlural = `${layerPascalCase}${pascalCasePlural}`

  // Check if this collection has translations
  const hasTranslations = config?.translations?.collections?.[plural] || config?.translations?.collections?.[singular]

  // Generate field selection for update with date conversion
  let fieldSelection = fields.map(field => {
    if (field.type === 'date') {
      return `    ${field.name}: body.${field.name} ? new Date(body.${field.name}) : body.${field.name}`
    }
    return `    ${field.name}: body.${field.name}`
  }).join(',\n')

  // Add translations field if needed
  if (hasTranslations) {
    fieldSelection += ',\n    translations: body.translations'
  }

  // Add imports based on translation needs
  const queriesPath = '../../../../database/queries'
  const imports = hasTranslations
    ? `import { update${prefixedPascalCase}, get${prefixedPascalCasePlural}ByIds } from '${queriesPath}'`
    : `import { update${prefixedPascalCase} } from '${queriesPath}'`

  return `// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
${imports}
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team-auth'
import type { ${prefixedPascalCase} } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { ${singular}Id } = getRouterParams(event)
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<${prefixedPascalCase}>>(event)${hasTranslations ? `

  // Handle translation updates properly
  if (body.translations && body.locale) {
    const [existing] = await get${prefixedPascalCasePlural}ByIds(team.id, [${singular}Id])
    if (existing) {
      body.translations = {
        ...existing.translations,
        [body.locale]: {
          ...existing.translations?.[body.locale],
          ...body.translations[body.locale]
        }
      }
    }
  }` : ''}

  return await update${prefixedPascalCase}(${singular}Id, team.id, user.id, {
${fieldSelection}
  })
})`
}

export function generateDeleteEndpoint(data, config = null) {
  const { singular, pascalCase, layerPascalCase, layer, plural } = data
  const prefixedPascalCase = `${layerPascalCase}${pascalCase}`

  const queriesPath = '../../../../database/queries'

  return `// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { delete${prefixedPascalCase} } from '${queriesPath}'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team-auth'

export default defineEventHandler(async (event) => {
  const { ${singular}Id } = getRouterParams(event)
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await delete${prefixedPascalCase}(${singular}Id, team.id, user.id)
})`
}

// Generate move endpoint for hierarchy-enabled collections
// Creates [id]/move.patch.ts - moves an item to a new parent and position
export function generateMoveEndpoint(data, config = null) {
  const { singular, pascalCase, layerPascalCase } = data
  const prefixedPascalCase = `${layerPascalCase}${pascalCase}`

  const queriesPath = '../../../../../database/queries'

  return `// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updatePosition${prefixedPascalCase} } from '${queriesPath}'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team-auth'

export default defineEventHandler(async (event) => {
  const { ${singular}Id } = getRouterParams(event)
  const { team } = await resolveTeamAndCheckMembership(event)

  const body = await readBody(event)

  // Validate input
  if (body.order === undefined || typeof body.order !== 'number') {
    throw createError({ statusCode: 400, statusMessage: 'order is required and must be a number' })
  }

  // parentId can be null (move to root) or a valid ID
  const parentId = body.parentId ?? null

  return await updatePosition${prefixedPascalCase}(team.id, ${singular}Id, parentId, body.order)
})`
}

// Generate reorder endpoint for hierarchy-enabled or sortable collections
// Creates reorder.patch.ts - bulk updates order for siblings within same parent
export function generateReorderEndpoint(data, config = null) {
  const { pascalCase, pascalCasePlural, layerPascalCase } = data
  const prefixedPascalCasePlural = `${layerPascalCase}${pascalCasePlural}`

  // Get the order field name from hierarchy config, default to 'order'
  const hierarchy = data.hierarchy || {}
  const orderField = hierarchy.orderField || 'order'

  const queriesPath = '../../../../database/queries'

  return `// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { reorderSiblings${prefixedPascalCasePlural} } from '${queriesPath}'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team-auth'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)

  const body = await readBody(event)

  // Validate input - expect array of { id, ${orderField} }
  if (!Array.isArray(body.updates)) {
    throw createError({ statusCode: 400, statusMessage: 'updates must be an array' })
  }

  for (const update of body.updates) {
    if (!update.id || typeof update.${orderField} !== 'number') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Each update must have id and ${orderField} (number)'
      })
    }
  }

  return await reorderSiblings${prefixedPascalCasePlural}(team.id, body.updates)
})`
}
