import { eq, and, isNull } from 'drizzle-orm'
import { translationsUi } from '../database/schema'
import * as tables from '@@/server/database/schema'

/**
 * Get team/organization by slug for translations
 * Uses the organization table from the auth schema (teams/organizations are stored in the organization table)
 *
 * NOTE: Named with 'ForTranslations' suffix to avoid conflict with the
 * getTeamBySlug function exported from @crouton/auth
 */
export async function getTeamBySlugForTranslations(slug: string) {
  const db = useDB()

  const team = await db
    .select()
    .from(tables.organization)
    .where(eq(tables.organization.slug, slug))
    .get()

  if (!team) {
    throw createError({
      statusCode: 404,
      statusMessage: `Team not found: ${slug}`
    })
  }

  return team
}

/**
 * Get system translations with team overrides
 * This is the critical function that merges system translations with team-specific overrides
 *
 * @param teamId - The team ID to get overrides for
 * @param locale - Optional locale filter (e.g., 'en', 'nl', 'fr')
 * @returns Array of translations with system values and team overrides
 */
export async function getSystemTranslationsWithTeamOverrides(teamId: string, locale?: string) {
  const db = useDB()

  // First, get all overrideable system translations
  const systemTranslations = await db
    .select({
      keyPath: translationsUi.keyPath,
      category: translationsUi.category,
      namespace: translationsUi.namespace,
      systemValues: translationsUi.values,
      systemId: translationsUi.id,
      isOverrideable: translationsUi.isOverrideable
    })
    .from(translationsUi)
    .where(
      and(
        isNull(translationsUi.teamId), // Only system translations
        eq(translationsUi.isOverrideable, true) // Only overrideable ones
      )
    )
    .orderBy(translationsUi.keyPath)

  // Then, get all team overrides for this team
  const teamOverrides = await db
    .select({
      keyPath: translationsUi.keyPath,
      namespace: translationsUi.namespace,
      teamValues: translationsUi.values,
      overrideId: translationsUi.id,
      overrideDescription: translationsUi.description,
      overrideUpdatedAt: translationsUi.updatedAt
    })
    .from(translationsUi)
    .where(eq(translationsUi.teamId, teamId))

  // Create a lookup map for team overrides
  const overrideMap = new Map()
  for (const override of teamOverrides) {
    const key = `${override.keyPath}:${override.namespace}`
    overrideMap.set(key, override)
  }

  // Combine system translations with team overrides
  const enhancedTranslations = systemTranslations.map((systemTranslation) => {
    const key = `${systemTranslation.keyPath}:${systemTranslation.namespace}`
    const override = overrideMap.get(key)

    return {
      keyPath: systemTranslation.keyPath,
      category: systemTranslation.category,
      namespace: systemTranslation.namespace,
      systemValues: systemTranslation.systemValues,
      systemId: systemTranslation.systemId,
      isOverrideable: systemTranslation.isOverrideable,
      teamValues: override?.teamValues || null,
      hasOverride: override !== undefined,
      overrideId: override?.overrideId || null,
      overrideDescription: override?.overrideDescription || null,
      overrideUpdatedAt: override?.overrideUpdatedAt || null
    }
  })

  // Filter by locale if provided
  if (locale) {
    return enhancedTranslations.filter(t =>
      t.systemValues && typeof t.systemValues === 'object' && t.systemValues !== null && locale in t.systemValues
    )
  }

  return enhancedTranslations
}

/**
 * Get all system translations (no team overrides)
 */
export async function getSystemTranslations() {
  const db = useDB()

  return await db
    .select()
    .from(translationsUi)
    .where(isNull(translationsUi.teamId))
    .orderBy(translationsUi.keyPath)
}

/**
 * Get all team translations for a specific team
 */
export async function getTeamTranslations(teamId: string) {
  const db = useDB()

  return await db
    .select()
    .from(translationsUi)
    .where(eq(translationsUi.teamId, teamId))
    .orderBy(translationsUi.keyPath)
}

/**
 * Create a new translation (system or team override)
 */
export async function createTranslation(data: {
  userId: string
  teamId?: string | null
  namespace?: string
  keyPath: string
  category: string
  values: Record<string, string>
  description?: string
  isOverrideable?: boolean
}) {
  const db = useDB()

  return await db
    .insert(translationsUi)
    .values({
      userId: data.userId,
      teamId: data.teamId || null,
      namespace: data.namespace || 'ui',
      keyPath: data.keyPath,
      category: data.category,
      values: data.values,
      description: data.description,
      isOverrideable: data.isOverrideable ?? true
    })
    .returning()
    .get()
}

/**
 * Update a translation
 */
export async function updateTranslation(id: string, updates: {
  values?: Record<string, string>
  description?: string
  isOverrideable?: boolean
}) {
  const db = useDB()

  return await db
    .update(translationsUi)
    .set(updates)
    .where(eq(translationsUi.id, id))
    .returning()
    .get()
}

/**
 * Delete a translation
 */
export async function deleteTranslation(id: string) {
  const db = useDB()

  return await db
    .delete(translationsUi)
    .where(eq(translationsUi.id, id))
    .returning()
    .get()
}

/**
 * Verify a translation belongs to a specific team
 * Throws 404 error if not found or doesn't belong to team
 */
export async function verifyTeamTranslation(translationId: string, teamId: string) {
  const db = useDB()

  const existing = await db
    .select()
    .from(translationsUi)
    .where(
      and(
        eq(translationsUi.id, translationId),
        eq(translationsUi.teamId, teamId)
      )
    )
    .get()

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Translation not found or does not belong to this team'
    })
  }

  return existing
}

/**
 * Get system translation by keyPath and namespace
 */
export async function getSystemTranslationByKeyPath(keyPath: string, namespace: string = 'ui') {
  const db = useDB()

  return await db
    .select()
    .from(translationsUi)
    .where(
      and(
        isNull(translationsUi.teamId),
        eq(translationsUi.keyPath, keyPath),
        eq(translationsUi.namespace, namespace)
      )
    )
    .get()
}
