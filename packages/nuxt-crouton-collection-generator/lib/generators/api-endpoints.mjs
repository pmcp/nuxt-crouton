// Generator for API endpoints
export function generateGetEndpoint(data, config = null) {
  const { pascalCase, pascalCasePlural, layerPascalCase, plural, singular, layer } = data
  const prefixedPascalCase = `${layerPascalCase}${pascalCase}`
  const prefixedPascalCasePlural = `${layerPascalCase}${pascalCasePlural}`

  // Check if this collection has translations
  const hasTranslations = config?.translations?.collections?.[plural] || config?.translations?.collections?.[singular]

  const queriesPath = '../../../../database/queries'

  return `import { getAll${prefixedPascalCasePlural}, get${prefixedPascalCasePlural}ByIds } from '${queriesPath}'
import { eq, and } from 'drizzle-orm'
import * as tables from '@@/server/database/schema'

export default defineEventHandler(async (event) => {
  const { id: teamSlugOrId } = getRouterParams(event)
  const { user } = await requireUserSession(event)

  // Resolve team by slug or ID
  let team = await useDB()
    .select()
    .from(tables.teams)
    .where(eq(tables.teams.slug, teamSlugOrId))
    .get()

  // If not found by slug, try by ID
  if (!team) {
    team = await useDB()
      .select()
      .from(tables.teams)
      .where(eq(tables.teams.id, teamSlugOrId))
      .get()
  }

  if (!team) {
    throw createError({ statusCode: 404, statusMessage: 'Team not found' })
  }

  // Check if user is member of team
  const membership = await useDB()
    .select()
    .from(tables.teamMembers)
    .where(
      and(
        eq(tables.teamMembers.teamId, team.id),
        eq(tables.teamMembers.userId, user.id)
      )
    )
    .get()

  if (!membership) {
    throw createError({ statusCode: 403, statusMessage: 'Unauthorized' })
  }

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

  return `import { create${prefixedPascalCase} } from '${queriesPath}'
import { eq, and } from 'drizzle-orm'
import * as tables from '@@/server/database/schema'

export default defineEventHandler(async (event) => {
  const { id: teamSlugOrId } = getRouterParams(event)
  const { user } = await requireUserSession(event)

  // Resolve team by slug or ID
  let team = await useDB()
    .select()
    .from(tables.teams)
    .where(eq(tables.teams.slug, teamSlugOrId))
    .get()

  // If not found by slug, try by ID
  if (!team) {
    team = await useDB()
      .select()
      .from(tables.teams)
      .where(eq(tables.teams.id, teamSlugOrId))
      .get()
  }

  if (!team) {
    throw createError({ statusCode: 404, statusMessage: 'Team not found' })
  }

  // Check if user is member of team
  const membership = await useDB()
    .select()
    .from(tables.teamMembers)
    .where(
      and(
        eq(tables.teamMembers.teamId, team.id),
        eq(tables.teamMembers.userId, user.id)
      )
    )
    .get()

  if (!membership) {
    throw createError({ statusCode: 403, statusMessage: 'Unauthorized' })
  }

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

  // Check if there are any date fields
  const dateFields = fields.filter(f => f.type === 'date')
  const hasDateFields = dateFields.length > 0

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

  return `${imports}
import { eq, and } from 'drizzle-orm'
import * as tables from '@@/server/database/schema'
import type { ${prefixedPascalCase} } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { id: teamSlugOrId, ${singular}Id } = getRouterParams(event)
  const { user } = await requireUserSession(event)

  // Resolve team by slug or ID
  let team = await useDB()
    .select()
    .from(tables.teams)
    .where(eq(tables.teams.slug, teamSlugOrId))
    .get()

  // If not found by slug, try by ID
  if (!team) {
    team = await useDB()
      .select()
      .from(tables.teams)
      .where(eq(tables.teams.id, teamSlugOrId))
      .get()
  }

  if (!team) {
    throw createError({ statusCode: 404, statusMessage: 'Team not found' })
  }

  // Check if user is member of team
  const membership = await useDB()
    .select()
    .from(tables.teamMembers)
    .where(
      and(
        eq(tables.teamMembers.teamId, team.id),
        eq(tables.teamMembers.userId, user.id)
      )
    )
    .get()

  if (!membership) {
    throw createError({ statusCode: 403, statusMessage: 'Unauthorized' })
  }

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

  return `import { delete${prefixedPascalCase} } from '${queriesPath}'
import { eq, and } from 'drizzle-orm'
import * as tables from '@@/server/database/schema'

export default defineEventHandler(async (event) => {
  const { id: teamSlugOrId, ${singular}Id } = getRouterParams(event)
  const { user } = await requireUserSession(event)

  // Resolve team by slug or ID
  let team = await useDB()
    .select()
    .from(tables.teams)
    .where(eq(tables.teams.slug, teamSlugOrId))
    .get()

  // If not found by slug, try by ID
  if (!team) {
    team = await useDB()
      .select()
      .from(tables.teams)
      .where(eq(tables.teams.id, teamSlugOrId))
      .get()
  }

  if (!team) {
    throw createError({ statusCode: 404, statusMessage: 'Team not found' })
  }

  // Check if user is member of team
  const membership = await useDB()
    .select()
    .from(tables.teamMembers)
    .where(
      and(
        eq(tables.teamMembers.teamId, team.id),
        eq(tables.teamMembers.userId, user.id)
      )
    )
    .get()

  if (!membership) {
    throw createError({ statusCode: 403, statusMessage: 'Unauthorized' })
  }

  return await delete${prefixedPascalCase}(${singular}Id, team.id, user.id)
})`
}
