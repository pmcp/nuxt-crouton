/**
 * Get system translations merged with team-specific overrides
 *
 * This endpoint is called by useT composable on mount to load all UI translations.
 * It returns a merged view of:
 * - System translations (teamId = null, isOverrideable = true)
 * - Team-specific overrides (teamId = specific team)
 *
 * Query params:
 * - locale: Optional locale filter (e.g., 'en', 'nl', 'fr')
 *
 * Response format:
 * [
 *   {
 *     keyPath: 'table.search',
 *     category: 'table',
 *     namespace: 'ui',
 *     systemValues: { en: 'Search', nl: 'Zoeken', fr: 'Rechercher' },
 *     systemId: 'xyz',
 *     isOverrideable: true,
 *     teamValues: { en: 'Find', nl: 'Vinden' }, // or null if no override
 *     hasOverride: true,
 *     overrideId: 'abc',
 *     overrideDescription: 'Custom search label',
 *     overrideUpdatedAt: Date
 *   }
 * ]
 */
export default defineEventHandler(async (event) => {
  const teamSlug = getRouterParam(event, 'id') // This is actually the slug from the URL
  if (!teamSlug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Team slug is required',
    })
  }

  // Get the team by slug
  // No auth required - translations are public read-only UI strings
  const team = await getTeamBySlug(teamSlug)

  const query = getQuery(event)
  const locale = query.locale as string | undefined

  // Get system translations with team overrides using the centralized query
  return await getSystemTranslationsWithTeamOverrides(team.id, locale)
})
