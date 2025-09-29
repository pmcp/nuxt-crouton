// Generator for API endpoints
export function generateGetEndpoint(data, config = null) {
  const { pascalCase, pascalCasePlural, layerPascalCase, plural, singular, layer } = data
  const prefixedPascalCase = `${layerPascalCase}${pascalCase}`
  const prefixedPascalCasePlural = `${layerPascalCase}${pascalCasePlural}`
  
  // Check if this collection has translations
  const hasTranslations = config?.translations?.collections?.[plural] || config?.translations?.collections?.[singular]

  const queriesPath = '../../../../database/queries'

  return `import { getAll${prefixedPascalCasePlural}, get${prefixedPascalCasePlural}ByIds } from '${queriesPath}'
import { isTeamMember } from '@@/server/database/queries/teams'

export default defineEventHandler(async (event) => {
  const { id: teamId } = getRouterParams(event)
  const { user } = await requireUserSession(event)
  const hasAccess = await isTeamMember(teamId, user.id)
  if (!hasAccess) {
    throw createError({ statusCode: 403, statusMessage: 'Unauthorized' })
  }

  const query = getQuery(event)${hasTranslations ? `
  // Accept locale for future translation handling
  const locale = String(query.locale || 'en')` : ''}
  if (query.ids) {
    const ids = String(query.ids).split(',')
    return await get${prefixedPascalCasePlural}ByIds(teamId, ids)
  }
  
  return await getAll${prefixedPascalCasePlural}(teamId)
})`
}

export function generatePostEndpoint(data, config = null) {
  const { singular, pascalCase, layerPascalCase, layer, plural } = data
  const prefixedPascalCase = `${layerPascalCase}${pascalCase}`

  const queriesPath = '../../../../database/queries'

  return `import { create${prefixedPascalCase} } from '${queriesPath}'
import { isTeamMember } from '@@/server/database/queries/teams'

export default defineEventHandler(async (event) => {
  const { id: teamId } = getRouterParams(event)
  const { user } = await requireUserSession(event)
  const hasAccess = await isTeamMember(teamId, user.id)
  if (!hasAccess) {
    throw createError({ statusCode: 403, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  
  // Exclude id field to let the database generate it
  const { id, ...dataWithoutId } = body
  
  return await create${prefixedPascalCase}({
    ...dataWithoutId,
    teamId,
    userId: user.id
  })
})`
}

export function generatePatchEndpoint(data, config = null) {
  const { singular, pascalCase, pascalCasePlural, layerPascalCase, fields, plural, layer } = data
  const prefixedPascalCase = `${layerPascalCase}${pascalCase}`
  const prefixedPascalCasePlural = `${layerPascalCase}${pascalCasePlural}`
  
  // Check if this collection has translations
  const hasTranslations = config?.translations?.collections?.[plural] || config?.translations?.collections?.[singular]

  // Generate field selection for update
  let fieldSelection = fields.map(field => `    ${field.name}: body.${field.name}`).join(',\n')
  
  // Add translations field if needed
  if (hasTranslations) {
    fieldSelection += ',\n    translations: body.translations'
  }
  
  // Add imports based on translation needs
  const queriesPath = '../../../../database/queries'
  const imports = hasTranslations
    ? `import { update${prefixedPascalCase}, get${prefixedPascalCasePlural}ByIds } from '${queriesPath}'`
    : `import { update${prefixedPascalCase} } from '${queriesPath}'`

  return `${imports}
import { isTeamMember } from '@@/server/database/queries/teams'
import type { ${prefixedPascalCase} } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { id: teamId, ${singular}Id } = getRouterParams(event)
  const { user } = await requireUserSession(event)
  const hasAccess = await isTeamMember(teamId, user.id)
  if (!hasAccess) {
    throw createError({ statusCode: 403, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<Partial<${prefixedPascalCase}>>(event)${hasTranslations ? `
  
  // Handle translation updates properly
  if (body.translations && body.locale) {
    const [existing] = await get${prefixedPascalCasePlural}ByIds(teamId, [${singular}Id])
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
  
  return await update${prefixedPascalCase}(${singular}Id, teamId, user.id, {
${fieldSelection}
  })
})`
}

export function generateDeleteEndpoint(data, config = null) {
  const { singular, pascalCase, layerPascalCase, layer, plural } = data
  const prefixedPascalCase = `${layerPascalCase}${pascalCase}`

  const queriesPath = '../../../../database/queries'

  return `import { delete${prefixedPascalCase} } from '${queriesPath}'
import { isTeamMember } from '@@/server/database/queries/teams'

export default defineEventHandler(async (event) => {
  const { id: teamId, ${singular}Id } = getRouterParams(event)
  const { user } = await requireUserSession(event)
  const hasAccess = await isTeamMember(teamId, user.id)
  if (!hasAccess) {
    throw createError({ statusCode: 403, statusMessage: 'Unauthorized' })
  }

  return await delete${prefixedPascalCase}(${singular}Id, teamId, user.id)
})`
}
